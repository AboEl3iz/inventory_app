import * as bcrypt from 'bcrypt';
const encryptPassword = async (
  password: string,
  salt: number,
): Promise<string> => {
  const hashPassword = await bcrypt.hash(password, salt);
  return hashPassword;
};

const comparePassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

export { encryptPassword, comparePassword };
