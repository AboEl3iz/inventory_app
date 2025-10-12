import { User } from "src/module/users/entities/user.entity";

export class CreateAuthDto {

    user: User
    refreshToken: string
    expiresAt: Date
}
