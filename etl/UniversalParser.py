#UniversalParser.py
import pandas as pd
import json
import re
import sys
from pathlib import Path


class TableParser:
    def __init__(self):
        self.re_seinfra_code = re.compile(r'^[A-Z]\d+$')
        self.re_sinapi_code  = re.compile(r'^\d+$')

    # ─── Leitura de arquivo ───────────────────────────────────────────────────

    def _read_file(self, file_path, **kwargs):
        ext = Path(file_path).suffix.lower()
        if ext == '.csv':
            return pd.read_csv(file_path, **kwargs)
        if ext == '.xls':
            kwargs.setdefault('engine', 'xlrd')
            return pd.read_excel(file_path, **kwargs)
        if ext == '.xlsx':
            return pd.read_excel(file_path, **kwargs)
        raise Exception(f'Formato nao suportado: {ext}')

    def _normalize_columns(self, df):
        df.columns = [
            re.sub(r'\s+', ' ', str(col).strip().lower()
                   .replace('\n', ' ').replace('.', ''))
            for col in df.columns
        ]
        return df

    def _clean_price(self, value):
        if pd.isna(value) or value == '':
            return None
        if isinstance(value, str):
            cleaned = re.sub(r'[^\d,.-]', '', value)
            if cleaned == '':
                return None
            if ',' in cleaned and '.' in cleaned:
                cleaned = cleaned.replace('.', '').replace(',', '.')
            elif ',' in cleaned:
                cleaned = cleaned.replace(',', '.')
            try:
                return float(cleaned)
            except Exception:
                return None
        try:
            return float(value)
        except Exception:
            return None

    # ─── SINAPI — parse de uma aba (ISD/ICD/CSD/CCD) ─────────────────────────

    def _parse_sinapi_sheet(self, file_path, sheet_name, reference_table_id):
        """
        Header real na linha 10 do Excel (linha 11 = primeiro dado).
        CE: indice 10 para insumos (ISD/ICD), indice 14 para composicoes (CSD/CCD).
        CSD/CCD: usa openpyxl para extrair codigo da formula HYPERLINK.
        ISD/ICD: pandas — codigos sao inteiros simples.
        """
        import openpyxl

        upper          = sheet_name.upper()
        is_composition = ('CSD' in upper or 'CCD' in upper)
        ce_idx         = 14 if is_composition else 10

        print(f'[PARSER] Aba {sheet_name} — CE idx={ce_idx}', file=sys.stderr)

        results = []
        skipped = {'codigo': 0, 'descricao': 0, 'preco': 0}

        if is_composition:
            wb = openpyxl.load_workbook(file_path, data_only=False, read_only=True)
            ws = wb[sheet_name]
            re_hyperlink = re.compile(r',\s*(\d+)\s*\)\s*$')

            for row in ws.iter_rows(min_row=11):
                vals = [cell.value for cell in row]
                if len(vals) <= ce_idx:
                    continue

                raw = vals[1]
                if raw is None:
                    skipped['codigo'] += 1
                    continue

                raw_str = str(raw).strip()
                if 'HYPERLINK' in raw_str.upper():
                    m      = re_hyperlink.search(raw_str)
                    codigo = m.group(1) if m else ''
                else:
                    codigo = re.sub(r'[^\d]', '', raw_str)

                if codigo in ('', '0'):
                    skipped['codigo'] += 1
                    continue
                if not self.re_sinapi_code.match(codigo):
                    skipped['codigo'] += 1
                    continue

                categoria = str(vals[0]).strip() if vals[0] else ''
                descricao = str(vals[2]).strip() if vals[2] else ''
                unidade   = str(vals[3]).strip() if vals[3] else ''

                if descricao in ('', 'nan', 'None'):
                    skipped['descricao'] += 1
                    continue
                if unidade in ('', 'nan', 'None'):
                    continue

                preco = self._clean_price(vals[ce_idx])
                if preco is None or preco <= 0:
                    skipped['preco'] += 1
                    continue

                results.append({
                    'code':             codigo,
                    'category':         categoria,
                    'description':      descricao,
                    'unit':             unidade,
                    'type':             'COMPOSICAO',
                    'basePrice':        preco,
                    'priceTableId': reference_table_id,
                })

            wb.close()

        else:
            df = self._read_file(file_path, sheet_name=sheet_name, header=9)
            df = self._normalize_columns(df)

            for _, row in df.iterrows():
                codigo = re.sub(r'[^\d]', '', str(row.iloc[1]).strip())

                if codigo in ('', '0'):
                    skipped['codigo'] += 1
                    continue
                if not self.re_sinapi_code.match(codigo):
                    skipped['codigo'] += 1
                    continue

                categoria = str(row.iloc[0]).strip()
                descricao = str(row.iloc[2]).strip()
                unidade   = str(row.iloc[3]).strip()

                if descricao in ('', 'nan'):
                    skipped['descricao'] += 1
                    continue
                if unidade in ('', 'nan'):
                    continue

                try:
                    preco = self._clean_price(row.iloc[ce_idx])
                except IndexError:
                    preco = None

                if preco is None or preco <= 0:
                    skipped['preco'] += 1
                    continue

                results.append({
                    'code':             codigo,
                    'category':         categoria,
                    'description':      descricao,
                    'unit':             unidade,
                    'type':             'INSUMO',
                    'basePrice':        preco,
                    'priceTableId': reference_table_id,
                })

        print(
            f'[PARSER] {sheet_name}: {len(results)} ok | '
            f'ignorados → codigo:{skipped["codigo"]} '
            f'desc:{skipped["descricao"]} preco:{skipped["preco"]}',
            file=sys.stderr
        )
        return results

    # ─── SINAPI — dual output (Plano B) ──────────────────────────────────────

    def parse_sinapi_dual(self, file_path, ref_onerada, ref_desonerada):
        """
        Le o arquivo SINAPI UMA VEZ e retorna:
          - onerada:    ISD + CSD
          - desonerada: ICD + CCD
        """
        excel  = pd.ExcelFile(file_path)
        sheets = excel.sheet_names
        print(f'[PARSER] Abas encontradas: {sheets}', file=sys.stderr)

        onerada    = []
        desonerada = []

        for sheet in sheets:
            up = sheet.upper()
            if 'ISD' in up:
                onerada.extend(self._parse_sinapi_sheet(file_path, sheet, ref_onerada))
            elif 'ICD' in up:
                desonerada.extend(self._parse_sinapi_sheet(file_path, sheet, ref_desonerada))
            elif 'CSD' in up:
                onerada.extend(self._parse_sinapi_sheet(file_path, sheet, ref_onerada))
            elif 'CCD' in up:
                desonerada.extend(self._parse_sinapi_sheet(file_path, sheet, ref_desonerada))

        print(
            f'[PARSER] SINAPI TOTAL → onerada:{len(onerada)} desonerada:{len(desonerada)}',
            file=sys.stderr
        )
        return {'onerada': onerada, 'desonerada': desonerada}

    # ─── SINAPI — composicoes analiticas (aba Analitico) ─────────────────────

    def parse_sinapi_analitico(self, file_path, reference_table_id):
        """
        Aba Analitico do SINAPI_Referencia.xlsx.
        Header na linha 10 (pandas header=9), dtype=str para evitar float nos codigos.

        Estrutura:
          col[1] = Codigo da Composicao (pai)
          col[2] = Tipo Item (nan = linha-pai, INSUMO/COMPOSICAO = filho)
          col[3] = Codigo do Item (filho)
          col[4] = Descricao
          col[5] = Unidade
          col[6] = Coeficiente

        Retorna { items, compositions }.
        """
        df = self._read_file(file_path, sheet_name='Analítico', header=9, dtype=str)

        items        = []
        compositions = []
        seen_codes   = set()
        skipped      = 0

        for _, row in df.iterrows():
            cod_pai   = str(row.iloc[1]).strip()
            tipo_item = str(row.iloc[2]).strip()
            cod_filho = str(row.iloc[3]).strip()
            descricao = str(row.iloc[4]).strip()
            unidade   = str(row.iloc[5]).strip()
            coef_raw  = row.iloc[6]

            if not self.re_sinapi_code.match(cod_pai):
                skipped += 1
                continue

            if tipo_item in ('nan', '', 'None'):
                # Linha-pai
                if cod_pai not in seen_codes:
                    if descricao not in ('', 'nan', 'None') and unidade not in ('', 'nan', 'None'):
                        items.append({
                            'code':             cod_pai,
                            'description':      descricao,
                            'unit':             unidade,
                            'type':             'COMPOSICAO',
                            'basePrice':        None,
                            'priceTableId': reference_table_id,
                            'category':         str(row.iloc[0]).strip(),
                        })
                        seen_codes.add(cod_pai)
            else:
                # Linha-filho
                if cod_filho in ('nan', '', 'None'):
                    skipped += 1
                    continue
                if not (self.re_sinapi_code.match(cod_filho) or self.re_seinfra_code.match(cod_filho)):
                    skipped += 1
                    continue

                try:
                    coeficiente = float(str(coef_raw).replace(',', '.'))
                except Exception:
                    coeficiente = 1.0

                compositions.append({
                    'parentCode':  cod_pai,
                    'childCode':   cod_filho,
                    'coefficient': coeficiente,
                    'unit':        unidade if unidade not in ('nan', '', 'None') else '',
                })

        print(
            f'[PARSER] SINAPI Analitico: {len(items)} composicoes, '
            f'{len(compositions)} relacoes | ignorados: {skipped}',
            file=sys.stderr
        )
        return {'items': items, 'compositions': compositions}

    # ─── SEINFRA — insumos ───────────────────────────────────────────────────

    def parse_seinfra_insumos(self, file_path, reference_table_id):
        """
        Header na linha 6: [Insumo, Descricao, Unidade, Valor (R$)]
        """
        df_raw = self._read_file(file_path, header=None, dtype=str)

        header_row = 5
        for idx, row in df_raw.iterrows():
            if str(row.iloc[0]).strip().lower() == 'insumo':
                header_row = idx
                break

        df = self._read_file(file_path, skiprows=header_row + 1, header=None, dtype=str)

        insumos = []
        for _, row in df.iterrows():
            codigo    = str(row.iloc[0]).strip()
            descricao = str(row.iloc[1]).strip()
            unidade   = str(row.iloc[2]).strip()
            preco     = self._clean_price(row.iloc[3])

            if not self.re_seinfra_code.match(codigo):
                continue
            if descricao in ('', 'nan', 'None'):
                continue
            if unidade in ('', 'nan', 'None'):
                continue
            if preco is None or preco <= 0:
                continue

            insumos.append({
                'code':             codigo,
                'description':      descricao,
                'unit':             unidade,
                'type':             'INSUMO',
                'basePrice':        preco,
                'priceTableId': reference_table_id,
            })

        print(f'[PARSER] SEINFRA insumos: {len(insumos)}', file=sys.stderr)
        return insumos

    # ─── SEINFRA — planos de servico ─────────────────────────────────────────

    def parse_seinfra_planos(self, file_path, reference_table_id):
        """
        Header na linha 4: [ITEM, CODIGO, DESCRICAO, nan, nan, UNIDADE, PRECO]
        Ignora agrupadores (item numerico tipo 1, 1.1, etc).
        """
        df_raw = self._read_file(file_path, header=None, dtype=str)

        header_row = 3
        for idx, row in df_raw.iterrows():
            vals = [str(v).strip().upper() for v in row.tolist()]
            if 'CÓDIGO' in vals or 'CODIGO' in vals or 'ITEM' in vals:
                header_row = idx
                break

        df = self._read_file(file_path, skiprows=header_row + 1, header=None, dtype=str)

        planos = []
        for _, row in df.iterrows():
            if len(row) < 7:
                continue

            codigo    = str(row.iloc[1]).strip()
            descricao = str(row.iloc[2]).strip()
            unidade   = str(row.iloc[5]).strip()
            preco     = self._clean_price(row.iloc[6])

            if not self.re_seinfra_code.match(codigo):
                continue
            if descricao in ('', 'nan', 'None'):
                continue
            if unidade in ('', 'nan', 'None'):
                continue
            if preco is None or preco <= 0:
                continue

            planos.append({
                'code':             codigo,
                'description':      descricao,
                'unit':             unidade,
                'type':             'COMPOSICAO',
                'basePrice':        preco,
                'priceTableId': reference_table_id,
            })

        print(f'[PARSER] SEINFRA planos: {len(planos)}', file=sys.stderr)
        return planos

    # ─── SEINFRA — composicoes analiticas ────────────────────────────────────

    def parse_seinfra_composicoes_analitico(self, file_path, reference_table_id):
        """
        Estrutura do arquivo Composicoes-028.xls:
          - Linha pai:   col[0] = "C1802 - BOMBA CENTRIFUGA..." (codigo + " - " + desc)
          - Linha filho: col[0] = codigo (ex: I0043), col[2] = unidade, col[3] = coef

        Retorna { items, compositions }.
        """
        df = self._read_file(file_path, header=None, dtype=str)

        re_pai   = re.compile(r'^([A-Z]\d+)\s*-\s*(.+)$')
        re_filho = re.compile(r'^[A-Z]\d+$')

        items          = []
        compositions   = []
        seen_codes     = set()
        current_parent = None
        skipped        = 0

        for _, row in df.iterrows():
            col0 = str(row.iloc[0]).strip()
            col2 = str(row.iloc[2]).strip() if len(row) > 2 else ''
            col3 = str(row.iloc[3]).strip() if len(row) > 3 else ''

            m = re_pai.match(col0)
            if m:
                current_parent = m.group(1)
                desc = m.group(2).strip()
                if current_parent not in seen_codes:
                    items.append({
                        'code':             current_parent,
                        'description':      desc,
                        'unit':             'UN',
                        'type':             'COMPOSICAO',
                        'basePrice':        None,
                        'priceTableId': reference_table_id,
                    })
                    seen_codes.add(current_parent)
                continue

            if current_parent and re_filho.match(col0):
                unidade = col2 if col2 not in ('nan', '', 'None') else ''
                try:
                    coeficiente = float(col3.replace(',', '.'))
                except Exception:
                    coeficiente = 1.0

                compositions.append({
                    'parentCode':  current_parent,
                    'childCode':   col0,
                    'coefficient': coeficiente,
                    'unit':        unidade,
                })
                continue

            skipped += 1

        print(
            f'[PARSER] SEINFRA composicoes analitico: {len(items)} pais, '
            f'{len(compositions)} relacoes | ignorados: {skipped}',
            file=sys.stderr
        )
        return {'items': items, 'compositions': compositions}

    # ─── Entry point ─────────────────────────────────────────────────────────

    def run(self, file_path, source_type, data_type, ref_onerada, ref_desonerada=''):
        source    = source_type.upper()
        data_type = data_type.upper()

        if source == 'SINAPI':
            if data_type == 'ANALITICO':
                return self.parse_sinapi_analitico(file_path, ref_onerada)
            return self.parse_sinapi_dual(file_path, ref_onerada, ref_desonerada)

        if source == 'SEINFRA':
            if data_type == 'INSUMOS':
                return self.parse_seinfra_insumos(file_path, ref_onerada)
            if data_type == 'PLANOS':
                return self.parse_seinfra_planos(file_path, ref_onerada)
            if data_type == 'COMPOSICOES':
                return self.parse_seinfra_composicoes_analitico(file_path, ref_onerada)

        return []


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # args: file_path source data_type ref_onerada [ref_desonerada] [out_file]
    if len(sys.argv) < 5:
        print(json.dumps({'error': 'Argumentos insuficientes'}))
        sys.exit(1)

    file_path      = sys.argv[1]
    source         = sys.argv[2]
    data_type      = sys.argv[3]
    ref_onerada    = sys.argv[4]

    ref_desonerada = ''
    out_file       = None

    if len(sys.argv) == 6:
        arg = sys.argv[5]
        if arg.endswith('.json'):
            out_file = arg
        else:
            ref_desonerada = arg

    if len(sys.argv) == 7:
        ref_desonerada = sys.argv[5]
        out_file       = sys.argv[6]

    parser = TableParser()
    data   = parser.run(file_path, source, data_type, ref_onerada, ref_desonerada)

    output = json.dumps(data, ensure_ascii=False)

    if out_file:
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f'[PARSER] Output gravado em {out_file}', file=sys.stderr)
    else:
        print(output)
