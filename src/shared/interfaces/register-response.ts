import { register } from 'module';

export interface IregisterResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  accesstoken: string;
  refreshtoken: string;
}
