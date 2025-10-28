import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { Branch } from './module/branches/entities/branch.entity';
import { Auth } from './module/auth/entities/auth.entity';
import { Category } from './module/categories/entities/category.entity';
import { Inventory } from './module/inventory/entities/inventory.entity';
import { Invoice } from './module/invoices/entities/invoice.entity';
import { InvoiceItem } from './module/invoices/entities/invoice_items.entity';
import { ProductAttributeValue } from './module/products/entities/product-attribute-value.entity';
import { ProductAttribute } from './module/products/entities/product-attribute.entity';
import { ProductVariantValue } from './module/products/entities/product-variant-value.entity';
import { ProductVariant } from './module/products/entities/product-variant.entity';
import { Product } from './module/products/entities/product.entity';
import { PurchaseItem } from './module/purchases/entities/purchase-item.entity';
import { Purchase } from './module/purchases/entities/purchase.entity';
import { StockMovement } from './module/stock/entities/stock.entity';
import { Supplier } from './module/suppliers/entities/supplier.entity';
import { User } from './module/users/entities/user.entity';
import { ProductImage } from './module/products/entities/product-images.entity';

// 🧩 Entities (adjust import path)


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
    ProductImage,
    Branch,
    Supplier,
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductVariant,
    ProductVariantValue,
    Inventory,
    StockMovement,
    Purchase,
    PurchaseItem,
    User,
    Auth,
    Invoice,
    InvoiceItem,
  ],
});

const encryptPassword = async (password: string) => bcrypt.hash(password, 10);
const generateRefreshToken = () => uuidv4();

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Connected to DB');

  // 🏬 Branches
  const cities = [
    'Cairo',
    'Alexandria',
    'Giza',
    'Mansoura',
    'Tanta',
    'Zagazig',
    'Suez',
    'Ismailia',
  ];

  const branchRepo = AppDataSource.getRepository(Branch);
  const branches = branchRepo.create(
    cities.map((city, i) => ({
      name: `${city} Branch`,
      address: faker.location.streetAddress({ useFullAddress: true }),
      phone: faker.phone.number(),
    }))
  );
  await branchRepo.save(branches);

  // 👥 Users + Auth
  const userRepo = AppDataSource.getRepository(User);
  const authRepo = AppDataSource.getRepository(Auth);
  const roles: ('admin' | 'manager' | 'cashier')[] = ['admin', 'manager', 'cashier'];
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

  // 🧾 Suppliers
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const suppliers = Array.from({ length: 12 }).map(() =>
    supplierRepo.create({
      name: `${faker.company.name()} Supplier`,
      contactPerson: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
    })
  );
  await supplierRepo.save(suppliers);

  // 🗂️ Categories
  const categoryRepo = AppDataSource.getRepository(Category);
  const categoryNames = ['Electronics', 'Accessories', 'Furniture', 'Clothing', 'Home Appliances', 'Laptops', 'Smartphones', 'Audio', 'Gaming'];
  const categories = categoryRepo.create(
    categoryNames.map((n) => ({ name: n }))
  );
  await categoryRepo.save(categories);

  // ⚙️ Attributes & Values
  const attrRepo = AppDataSource.getRepository(ProductAttribute);
  const attrValRepo = AppDataSource.getRepository(ProductAttributeValue);

  const attrDefs = [
    { name: 'Color', values: ['Red', 'Blue', 'Black', 'White', 'Green'] },
    { name: 'Storage', values: ['64GB', '128GB', '256GB', '512GB'] },
    { name: 'Size', values: ['Small', 'Medium', 'Large'] },
    { name: 'RAM', values: ['4GB', '8GB', '16GB'] },
  ];

  const attrs: ProductAttribute[] = [];
  const attrValues: ProductAttributeValue[] = [];
  for (const def of attrDefs) {
    const attr = attrRepo.create({
      name: def.name,
      category: faker.helpers.arrayElement(categories),
    });
    await attrRepo.save(attr);
    attrs.push(attr);

    const values = def.values.map((val) =>
      attrValRepo.create({ value: val, attribute: attr })
    );
    await attrValRepo.save(values);
    attrValues.push(...values);
  }

  // 🛍️ Products
  const productRepo = AppDataSource.getRepository(Product);
  const productNames = Array.from({ length: 60 }, () =>
    faker.commerce.productName()
  );
  const products: Product[] = [];

  for (const name of productNames) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const category = faker.helpers.arrayElement(categories);
    const product = productRepo.create({
      name,
      description: faker.commerce.productDescription(),
      brand: faker.company.name(),
      basePrice: faker.number.int({ min: 500, max: 20000 }),
      isActive: true,
      category,
      supplier,
    });
    await productRepo.save(product);
    products.push(product);
  }

  // 🔢 Variants
  const variantRepo = AppDataSource.getRepository(ProductVariant);
  const variantValRepo = AppDataSource.getRepository(ProductVariantValue);
  const variants: ProductVariant[] = [];

  for (const product of products) {
    const count = faker.number.int({ min: 2, max: 6 });
    for (let i = 0; i < count; i++) {
      const variant = variantRepo.create({
        sku: faker.string.alphanumeric(10).toUpperCase(),
        barcode: faker.string.numeric(13),
        price: (Number(product.basePrice) + faker.number.int({ min: 100, max: 1000 })),
        costPrice: product.basePrice,
        isActive: true,
        product,
      });
      await variantRepo.save(variant);
      variants.push(variant);

      const chosenAttrs = faker.helpers.arrayElements(attrValues, 2);
      for (const av of chosenAttrs) {
        await variantValRepo.save(
          variantValRepo.create({ variant, attributeValue: av })
        );
      }
    }
  }

  // 🏬 Inventory + Stock
  const inventoryRepo = AppDataSource.getRepository(Inventory);
  const stockRepo = AppDataSource.getRepository(StockMovement);
  for (const branch of branches) {
    for (const variant of faker.helpers.arrayElements(variants, 150)) {
      const qty = faker.number.int({ min: 5, max: 50 });
      const inventory = inventoryRepo.create({
        variant,
        branch,
        quantity: qty,
        minThreshold: faker.number.int({ min: 2, max: 10 }),
      });
      await inventoryRepo.save(inventory);

      const stock = stockRepo.create({
        variant,
        branch,
        type: 'purchase',
        quantityChange: qty,
        quantityBefore: 0,
        quantityAfter: qty,
        user: faker.helpers.arrayElement(users),
      });
      await stockRepo.save(stock);
    }
  }

  // 💸 Purchases
  const purchaseRepo = AppDataSource.getRepository(Purchase);
  const purchaseItemRepo = AppDataSource.getRepository(PurchaseItem);
  for (let i = 0; i < 60; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const branch = faker.helpers.arrayElement(branches);
    const user = faker.helpers.arrayElement(users);
    const purchase = purchaseRepo.create({
      purchaseNumber: `PUR-${faker.string.numeric(6)}`,
      supplier,
      branch,
      user,
      subtotal: 20000,
      totalAmount: 22000,
      status: 'completed',
    });
    await purchaseRepo.save(purchase);

    const chosenVariants = faker.helpers.arrayElements(variants, 3);
    for (const v of chosenVariants) {
      const qty = faker.number.int({ min: 1, max: 8 });
      const item = purchaseItemRepo.create({
        purchase,
        variant: v,
        quantity: qty,
        unitCost: v.costPrice,
        subtotal: (Number(v.costPrice) * qty),
      });
      await purchaseItemRepo.save(item);
    }
  }

  // 🧾 Invoices
  const invoiceRepo = AppDataSource.getRepository(Invoice);
  const invoiceItemRepo = AppDataSource.getRepository(InvoiceItem);
  for (let i = 0; i < 150; i++) {
    const branch = faker.helpers.arrayElement(branches);
    const user = faker.helpers.arrayElement(users.filter(u => u.branch.id === branch.id));
    const invoice = invoiceRepo.create({
      invoiceNumber: `INV-${faker.string.numeric(6)}`,
      branch,
      user,
      subtotal: 15000,
      totalAmount: 16500,
      status: faker.helpers.arrayElement(['pending', 'paid', 'cancelled']),
      paymentMethod: faker.helpers.arrayElement(['cash', 'card']),
    });
    await invoiceRepo.save(invoice);

    const chosenVariants = faker.helpers.arrayElements(variants, 3);
    for (const v of chosenVariants) {
      const qty = faker.number.int({ min: 1, max: 5 });
      const item = invoiceItemRepo.create({
        invoice,
        variant: v,
        quantity: qty,
        unitPrice: v.price,
        subtotal: (Number(v.price) * qty),
      });
      await invoiceItemRepo.save(item);
    }
  }

  console.log('🎉 Large dataset seeded successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  AppDataSource.destroy();
});
