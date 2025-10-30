import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DebugEmailController } from './debug.controller';
import { DebugAdminController } from './debug-admin.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailService } from '@/common/services';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') || '1d';
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any, // Cast to satisfy jwt.SignOptions type
          },
        };
      },
    }),
  ],
  controllers: [AuthController, DebugEmailController, DebugAdminController],
  providers: [AuthService, JwtStrategy, LocalStrategy, EmailService],
  exports: [AuthService],
})
export class AuthModule {}
