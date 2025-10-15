import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

// 🧩 Import Entities
import { Branch } from './module/branches/entities/branch.entity';
import { Supplier } from './module/suppliers/entities/supplier.entity';
import { Category } from './module/categories/entities/category.entity';
import { Product } from './module/products/entities/product.entity';
import { ProductAttribute } from './module/products/entities/product-attribute.entity';
import { ProductAttributeValue } from './module/products/entities/product-attribute-value.entity';
import { ProductVariant } from './module/products/entities/product-variant.entity';
import { ProductVariantValue } from './module/products/entities/product-variant-value.entity';
import { Inventory } from './module/inventory/entities/inventory.entity';
import { Stock } from './module/stock/entities/stock.entity';
import { Purchase } from './module/purchases/entities/purchase.entity';
import { User } from './module/users/entities/user.entity';
import { Auth } from './module/auth/entities/auth.entity';
import { Invoice } from './module/invoices/entities/invoice.entity';

// ⚙️ DB Connection Config
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'admin',
  password: 'admin',
  database: 'inventory_app',
  synchronize: true,
  logging: false,
  entities: [
    Invoice,
    Branch,
    Supplier,
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductVariant,
    ProductVariantValue,
    Inventory,
    Stock,
    Purchase,
    User,
    Auth,
  ],
});

// 🔐 Helpers
const encryptPassword = async (password: string, salt = 10): Promise<string> =>
  await bcrypt.hash(password, salt);

const generateRefreshToken = () => uuidv4();

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database');

  // 📦 Repositories
  const branchRepo = AppDataSource.getRepository(Branch);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const categoryRepo = AppDataSource.getRepository(Category);
  const productRepo = AppDataSource.getRepository(Product);
  const attrRepo = AppDataSource.getRepository(ProductAttribute);
  const attrValRepo = AppDataSource.getRepository(ProductAttributeValue);
  const variantRepo = AppDataSource.getRepository(ProductVariant);
  const variantValRepo = AppDataSource.getRepository(ProductVariantValue);
  const inventoryRepo = AppDataSource.getRepository(Inventory);
  const stockRepo = AppDataSource.getRepository(Stock);
  const purchaseRepo = AppDataSource.getRepository(Purchase);
  const userRepo = AppDataSource.getRepository(User);
  const authRepo = AppDataSource.getRepository(Auth);
  const invoiceRepo = AppDataSource.getRepository(Invoice);

  // 🏬 Branches
  const branches = branchRepo.create([
    { name: 'Cairo Branch', address: 'Nasr City, Cairo', phone: '0101000000' },
    { name: 'Alex Branch', address: 'Stanley, Alexandria', phone: '0102000000' },
    { name: 'Giza Branch', address: 'Dokki, Giza', phone: '0103000000' },
    { name: 'Mansoura Branch', address: 'El Gomhoria St.', phone: '0104000000' },
    { name: 'Aswan Branch', address: 'Corniche Aswan', phone: '0105000000' },
  ]);
  await branchRepo.save(branches);

  // 🧍 Users + Auth
  const roles = ['admin', 'manager', 'cashier'] as const;
  const users: User[] = [];
  for (const branch of branches) {
    for (const role of roles) {
      const user = userRepo.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: await encryptPassword('123456'),
        role,
        branch,
      });
      await userRepo.save(user);

      const auth = authRepo.create({
        user,
        refreshToken: generateRefreshToken(),
        expiresAt: faker.date.soon({ days: 7 }),
      });
      await authRepo.save(auth);
      users.push(user);
    }
  }

  // 🏭 Suppliers
  const suppliers = supplierRepo.create([
    {
      name: 'Apple Supplier',
      contactPerson: 'Steve Jobs',
      phone: faker.phone.number(),
      email: 'apple@supplier.com',
    },
    {
      name: 'Samsung Supplier',
      contactPerson: 'Lee Byung-chul',
      phone: faker.phone.number(),
      email: 'samsung@supplier.com',
    },
    {
      name: 'Dell Supplier',
      contactPerson: 'Michael Dell',
      phone: faker.phone.number(),
      email: 'dell@supplier.com',
    },
  ]);
  await supplierRepo.save(suppliers);

  // 🗂️ Categories
  const electronics = categoryRepo.create({ name: 'Electronics' });
  const smartphones = categoryRepo.create({ name: 'Smartphones', parent: electronics });
  const laptops = categoryRepo.create({ name: 'Laptops', parent: electronics });
  await categoryRepo.save([electronics, smartphones, laptops]);

  // 🧩 Product Attributes
  const attrColor = attrRepo.create({ name: 'Color', category: smartphones });
  const attrStorage = attrRepo.create({ name: 'Storage', category: smartphones });
  const attrRam = attrRepo.create({ name: 'RAM', category: laptops });
  await attrRepo.save([attrColor, attrStorage, attrRam]);

  // ⚙️ Attribute Values
  const attrValues = attrValRepo.create([
    { value: 'Red', attribute: attrColor },
    { value: 'Blue', attribute: attrColor },
    { value: '128GB', attribute: attrStorage },
    { value: '256GB', attribute: attrStorage },
    { value: '8GB', attribute: attrRam },
    { value: '16GB', attribute: attrRam },
  ]);
  await attrValRepo.save(attrValues);

  // 🛍️ Products
  const products: Product[] = [];
  const productNames = [
    'iPhone 14 Pro',
    'iPhone 13',
    'Samsung Galaxy S24',
    'Samsung A55',
    'Dell XPS 13',
    'Dell Inspiron',
    'MacBook Air M2',
    'MacBook Pro M3',
    'Galaxy Book 4',
    'iPad Pro 12.9',
  ];

  for (const name of productNames) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const category = name.includes('iPhone') || name.includes('Samsung') || name.includes('iPad')
      ? smartphones
      : laptops;
    const product = productRepo.create({
      name,
      description: faker.commerce.productDescription(),
      brand: supplier.name.split(' ')[0],
      basePrice: faker.number.float({ min: 8000, max: 50000 }),
      isActive: true,
      category,
      supplier,
    });
    await productRepo.save(product);
    products.push(product);
  }

  // 🧾 Variants + Variant Values
  for (const product of products) {
    const variant = variantRepo.create({
      sku: faker.string.alphanumeric(10).toUpperCase(),
      barcode: faker.string.numeric(13),
      price: product.basePrice + faker.number.int({ min: 500, max: 2000 }),
      costPrice: product.basePrice,
      stockQuantity: faker.number.int({ min: 5, max: 30 }),
      isActive: true,
      product,
    });
    await variantRepo.save(variant);

    const colorVal = faker.helpers.arrayElement(attrValues.filter((v) => v.attribute.name === 'Color'));
    const storageVal = faker.helpers.arrayElement(attrValues.filter((v) => v.attribute.name === 'Storage'));

    await variantValRepo.save([
      variantValRepo.create({ variant, attributeValue: colorVal }),
      variantValRepo.create({ variant, attributeValue: storageVal }),
    ]);
  }

  // 📦 Inventory + Stock
  for (const branch of branches) {
    for (const product of faker.helpers.arrayElements(products, 5)) {
      const quantity = faker.number.int({ min: 3, max: 20 });
      const inv = inventoryRepo.create({
        branch,
        product,
        quantity,
        minThreshold: faker.number.int({ min: 5, max: 10 }),
      });
      await inventoryRepo.save(inv);

      const stock = stockRepo.create({
        branch,
        product,
        quantity,
        type: 'IN',
      });
      await stockRepo.save(stock);
    }
  }

  // 💰 Purchases
  for (let i = 0; i < 10; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const user = faker.helpers.arrayElement(users);
    const branch = faker.helpers.arrayElement(branches);
    const purchase = purchaseRepo.create({
      supplier,
      user,
      branch,
      totalAmount: faker.number.float({ min: 5000, max: 50000 }),
      status: faker.helpers.arrayElement(['pending', 'completed', 'canceled']),
    });
    await purchaseRepo.save(purchase);
  }

  // 🧾 Invoices (NEW PART)
  for (let i = 0; i < 20; i++) {
    const branch = faker.helpers.arrayElement(branches);
    const user = faker.helpers.arrayElement(users.filter(u => u.branch.id === branch.id));
    const totalAmount = faker.number.float({ min: 2000, max: 25000 });
    const status = faker.helpers.arrayElement(['paid', 'unpaid', 'refunded']);
    const invoice = invoiceRepo.create({
      user,
      branch,
      totalAmount,
      status,
    });
    await invoiceRepo.save(invoice);
  }

  console.log('🎉 Seed data generated successfully including invoices!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Error while seeding:', err);
  AppDataSource.destroy();
});