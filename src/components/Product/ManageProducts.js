'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ManageProducts.module.css';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [newGoldRate, setNewGoldRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Ring',
    purity: '22K',
    weight: '',
    metalType: 'Gold',
    makingCharges: '',
    makingChargeType: 'Fixed',
    stoneDetails: {
      hasStone: false,
      stoneType: '',
      stoneWeight: '',
      stonePrice: '',
    },
    stock: '',
  });

  const categories = [
    'Ring',
    'Necklace',
    'Bracelet',
    'Earring',
    'Anklet',
    'Pendant',
    'Chain',
    'Other',
  ];
  const purities = ['22K', '18K', '14K', '10K'];
  const metalTypes = ['Gold', 'Silver', 'Platinum', 'Mixed'];
  const chargeTypes = ['Fixed', 'Percentage', 'PerGram'];

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(filterCategory && { category: filterCategory }),
      });

      const res = await fetch(`/api/products?${query}`);
      const data = await res.json();

      setProducts(data.products || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterCategory]);

  const fetchGoldRate = useCallback(async () => {
    try {
      const res = await fetch('/api/products/gold-rate');
      const data = await res.json();
      setGoldRate(data.goldRate);
      setNewGoldRate(data.goldRate);
    } catch (error) {
      console.error('Error fetching gold rate:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchGoldRate();
  }, [fetchProducts, fetchGoldRate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('stoneDetails.')) {
      const field = name.split('.')[1];
      if (field === 'hasStone') {
        setFormData({
          ...formData,
          stoneDetails: {
            ...formData.stoneDetails,
            [field]: checked,
          },
        });
      } else {
        setFormData({
          ...formData,
          stoneDetails: {
            ...formData.stoneDetails,
            [field]: value,
          },
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/products/${editingId}` : '/api/products';

      const submitData = {
        ...formData,
        weight: parseFloat(formData.weight),
        makingCharges: parseFloat(formData.makingCharges),
        stock: parseInt(formData.stock),
      };

      if (formData.stoneDetails.hasStone) {
        submitData.stoneDetails.stoneWeight = parseFloat(
          formData.stoneDetails.stoneWeight
        );
        submitData.stoneDetails.stonePrice = parseFloat(
          formData.stoneDetails.stonePrice
        );
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error saving product');
        return;
      }

      alert('Product saved successfully');
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        sku: '',
        category: 'Ring',
        purity: '22K',
        weight: '',
        metalType: 'Gold',
        makingCharges: '',
        makingChargeType: 'Fixed',
        stoneDetails: {
          hasStone: false,
          stoneType: '',
          stoneWeight: '',
          stonePrice: '',
        },
        stock: '',
      });
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    }
  };

  const handleUpdateGoldRate = async () => {
    try {
      const res = await fetch('/api/products/gold-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goldRate: parseFloat(newGoldRate) }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert('Error updating gold rate');
        return;
      }

      setGoldRate(parseFloat(newGoldRate));
      alert('Gold rate updated successfully');
      setShowRateModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error updating gold rate:', error);
    }
  };

  const handleEdit = (product) => {
    setFormData(product);
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error deleting product');
        return;
      }

      alert('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      sku: '',
      category: 'Ring',
      purity: '22K',
      weight: '',
      metalType: 'Gold',
      makingCharges: '',
      makingChargeType: 'Fixed',
      stoneDetails: {
        hasStone: false,
        stoneType: '',
        stoneWeight: '',
        stonePrice: '',
      },
      stock: '',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Product Management</h1>
        <div className={styles.buttons}>
          <button
            className={styles.rateBtn}
            onClick={() => setShowRateModal(true)}
          >
            💰 Gold Rate: ₹{goldRate}/gm
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add Product
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {showRateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Update Gold Rate</h2>
            <div className={styles.formGroup}>
              <label>Gold Rate (₹/gm)</label>
              <input
                type="number"
                value={newGoldRate}
                onChange={(e) => setNewGoldRate(e.target.value)}
                step="0.1"
              />
            </div>
            <div className={styles.formActions}>
              <button className="btn-primary" onClick={handleUpdateGoldRate}>
                Update Rate
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowRateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
          <div
            className={styles.backdrop}
            onClick={() => setShowRateModal(false)}
          ></div>
        </div>
      )}

      {showForm && (
        <div className={styles.modal}>
          <div className={styles.formContent}>
            <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>

            <form onSubmit={handleSubmit}>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Purity *</label>
                  <select
                    name="purity"
                    value={formData.purity}
                    onChange={handleInputChange}
                  >
                    {purities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Weight (gm) *</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.1"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Metal Type</label>
                  <select
                    name="metalType"
                    value={formData.metalType}
                    onChange={handleInputChange}
                  >
                    {metalTypes.map((mt) => (
                      <option key={mt} value={mt}>
                        {mt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Making Charges *</label>
                  <input
                    type="number"
                    name="makingCharges"
                    value={formData.makingCharges}
                    onChange={handleInputChange}
                    step="0.1"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Charge Type</label>
                  <select
                    name="makingChargeType"
                    value={formData.makingChargeType}
                    onChange={handleInputChange}
                  >
                    {chargeTypes.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.stoneSection}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="stoneDetails.hasStone"
                    checked={formData.stoneDetails.hasStone}
                    onChange={handleInputChange}
                  />
                  Has Stone
                </label>

                {formData.stoneDetails.hasStone && (
                  <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                      <label>Stone Type</label>
                      <input
                        type="text"
                        name="stoneDetails.stoneType"
                        value={formData.stoneDetails.stoneType}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Stone Weight (ct)</label>
                      <input
                        type="number"
                        name="stoneDetails.stoneWeight"
                        value={formData.stoneDetails.stoneWeight}
                        onChange={handleInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Stone Price (₹)</label>
                      <input
                        type="number"
                        name="stoneDetails.stonePrice"
                        value={formData.stoneDetails.stonePrice}
                        onChange={handleInputChange}
                        step="0.1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div className={styles.backdrop} onClick={handleCancel}></div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading products...</div>
      ) : products.length > 0 ? (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Purity</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td className={styles.strong}>{product.name}</td>
                  <td>{product.sku || '-'}</td>
                  <td>{product.category}</td>
                  <td>{product.weight}gm</td>
                  <td>{product.purity}</td>
                  <td>{product.totalPrice > 0 ? `₹${product.totalPrice.toLocaleString('en-IN')}` : 'Live at billing'}</td>
                  <td>
                    <span
                      className={
                        product.stock > 0
                          ? 'badge badge-success'
                          : 'badge badge-error'
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEdit(product)}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(product._id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="btn-secondary"
            >
              ← Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="btn-primary"
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        <div className={styles.noData}>
          <p>No products found. Add your first product!</p>
        </div>
      )}
    </div>
  );
}
