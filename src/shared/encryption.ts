import * as bcrypt from 'bcrypt';
export const encryptPassword = async (password: string, salt: number): Promise<string> => {
    const hashPassword = await bcrypt.hash(password, salt);
    return hashPassword;
}