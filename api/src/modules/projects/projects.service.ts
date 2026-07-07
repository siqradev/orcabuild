import { prisma } from "../../lib/prisma.js";
import type { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from "./projects.schemas.js";
import { UserRole } from "../../generated/client.js";

//Lista projetos
export const listProjects = async (userId: string, userRole: UserRole, query: ListProjectsQuery ) => {
    const { status, page, limit } = query;
    const skip = ( page - 1) * limit;

    //ADMIN vê tudo. outros usuários veem só os propios projetos 
    const where = {
        ...(userRole !== 'ADMIN'  && { userId }),
        ...(status && {status}),
    };
    // Executa contagem e busca em paralelo para melhor performance
    const [total, projects ] = await Promise.all([
        prisma.project.count({ where}),
        prisma.project.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc'},
            include: {
                _count: {select: { budgets: true}}, //quantos orçamentos tem
                user: { select: {id: true, name: true, email: true }},
            },
        }),
    ]);
    return {
        data: projects,
        meta:{ total,page, limit, totalPages: Math.ceil( total/ limit),

        },
    };
}

//Busca um projeto por ID
export const getProjectById = async (projectId: string, userId: string, userRole: UserRole) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId},
        include: {
             user: { select: { id: true, name: true, email: true}},
             budgets: { 
                orderBy: { createdAt: 'desc'},
                select: { 
                    id: true, 
                    title: true,
                    status: true,
                    version: true,
                    totalCost: true,
                    currency: true,
                    createdAt: true,
                },
             },
        },
    })
    if (!project ){
        throw new Error('Projeto não encontrado');
    }
    // Usuário comum só pode ver projetos que pertencem a ele
    if (userRole !== 'ADMIN' && project.userId !== userId ) {
        throw new Error('Acesso negado')
    }
    return project;
}

//Criar projeto 
export const createProject = ( userId: string, data: CreateProjectInput ) => {
    return prisma.project.create({
        data: { 
            ...data,
            userId,
        },
        include: {
            user: { select: { id: true, name: true, email: true }},
        },
    })
}

//Atualizar projeto
export const updateProject = async ( 
    projectId: string, 
    userId: string, 
    userRole: UserRole,
    data: UpdateProjectInput
) => {
    //Verificar existência e permissão antes de atualizar
    await getProjectById( projectId, userId, userRole )
    return prisma.project.update({
        where: { id: projectId},
        data,
        include: {
            user: { select: { id: true, name: true, email: true}},
        },
    })  
}

// Deletar projeto
export async function deleteProject(
  projectId: string,
  userId: string,
  userRole: UserRole
) {
  // Verifica existência e permissão antes de deletar
  await getProjectById(projectId, userId, userRole);

  await prisma.project.delete({
    where: { id: projectId },
  });

  return { message: "Projeto deletado com sucesso" };
}

