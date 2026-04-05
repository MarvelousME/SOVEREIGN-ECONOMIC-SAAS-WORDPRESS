import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { Product } from '../types';

export class ProductService {
  async findById(id: string): Promise<Product | null> {
    const row = await db.queryOne<any>(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return row ? this.mapRowToProduct(row) : null;
  }

  async findByMerchant(merchantId: string, options?: {
    limit?: number;
    offset?: number;
    category?: string;
  }): Promise<{ products: Product[]; total: number }> {
    const { limit = 50, offset = 0, category } = options || {};

    let whereClause = 'WHERE merchant_id = $1';
    const params: any[] = [merchantId];

    if (category) {
      whereClause += ' AND category = $2';
      params.push(category);
    }

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM products ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      products: rows.map(row => this.mapRowToProduct(row)),
      total,
    };
  }

  async create(data: {
    merchantId: string;
    name: string;
    sku?: string;
    description?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    imageUrl?: string;
    productUrl?: string;
    originalPrice?: number;
    currentPrice?: number;
    salePrice?: number;
    currency?: string;
    inStock?: boolean;
    stockQuantity?: number;
    specifications?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<Product> {
    const id = uuidv4();

    const row = await db.queryOne<any>(
      `INSERT INTO products (
        id, merchant_id, name, sku, description, category, subcategory,
        brand, image_url, product_url, original_price, current_price,
        sale_price, currency, in_stock, stock_quantity, specifications, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id,
        data.merchantId,
        data.name,
        data.sku || null,
        data.description || null,
        data.category || null,
        data.subcategory || null,
        data.brand || null,
        data.imageUrl || null,
        data.productUrl || null,
        data.originalPrice || null,
        data.currentPrice || null,
        data.salePrice || null,
        data.currency || 'USD',
        data.inStock !== undefined ? data.inStock : true,
        data.stockQuantity || null,
        JSON.stringify(data.specifications || {}),
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRowToProduct(row);
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.sku !== undefined) {
      updates.push(`sku = $${paramIndex++}`);
      params.push(data.sku);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }
    if (data.subcategory !== undefined) {
      updates.push(`subcategory = $${paramIndex++}`);
      params.push(data.subcategory);
    }
    if (data.brand !== undefined) {
      updates.push(`brand = $${paramIndex++}`);
      params.push(data.brand);
    }
    if (data.imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      params.push(data.imageUrl);
    }
    if (data.productUrl !== undefined) {
      updates.push(`product_url = $${paramIndex++}`);
      params.push(data.productUrl);
    }
    if (data.originalPrice !== undefined) {
      updates.push(`original_price = $${paramIndex++}`);
      params.push(data.originalPrice);
    }
    if (data.currentPrice !== undefined) {
      updates.push(`current_price = $${paramIndex++}`);
      params.push(data.currentPrice);
    }
    if (data.salePrice !== undefined) {
      updates.push(`sale_price = $${paramIndex++}`);
      params.push(data.salePrice);
    }
    if (data.inStock !== undefined) {
      updates.push(`in_stock = $${paramIndex++}`);
      params.push(data.inStock);
    }
    if (data.stockQuantity !== undefined) {
      updates.push(`stock_quantity = $${paramIndex++}`);
      params.push(data.stockQuantity);
    }
    if (data.specifications !== undefined) {
      updates.push(`specifications = $${paramIndex++}`);
      params.push(JSON.stringify(data.specifications));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const row = await db.queryOne<any>(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return row ? this.mapRowToProduct(row) : null;
  }

  async findOrCreate(data: {
    merchantId: string;
    name: string;
    sku?: string;
  }): Promise<Product> {
    if (data.sku) {
      const existing = await db.queryOne<any>(
        'SELECT * FROM products WHERE merchant_id = $1 AND sku = $2',
        [data.merchantId, data.sku]
      );
      if (existing) {
        return this.mapRowToProduct(existing);
      }
    }

    return this.create(data);
  }

  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      sku: row.sku,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      brand: row.brand,
      imageUrl: row.image_url,
      productUrl: row.product_url,
      originalPrice: row.original_price ? parseFloat(row.original_price) : null,
      currentPrice: row.current_price ? parseFloat(row.current_price) : null,
      salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
      currency: row.currency || 'USD',
      inStock: row.in_stock,
      stockQuantity: row.stock_quantity,
      specifications: row.specifications ? JSON.parse(row.specifications) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const productService = new ProductService();
