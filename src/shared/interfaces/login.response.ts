import { Invoice } from 'src/module/invoices/entities/invoice.entity';
import { Purchase } from 'src/module/purchases/entities/purchase.entity';

export interface IloginResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  purchases: Purchase[];
  invoices: Invoice[];
  accesstoken: string;
  refreshtoken: string;
}
