import passport     from "passport";
import passportJwt  from "passport-jwt";
import { prisma }   from "../lib/prisma.js";

const JwtStrategy = passportJwt.Strategy;
const ExtractJwt  = passportJwt.ExtractJwt;

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    process.env.JWT_SECRET!,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where:  { id: payload.sub },
          select: { id: true, name: true, email: true, role: true },
        });
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;
