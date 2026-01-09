import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { productsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  images: string[];
  likes: number;
  likedBy: string[];
  purchaseCount: number;
  stock: number;
  isAvailable: boolean;
  rating: number;
}

export default function ShopScreen() {
  const { user } = useAuth();
  const { getCacheData, setCacheData } = useDataCache();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', 'jersey', 'shoes', 'accessories', 'equipment', 'merchandise', 'other'];

  useEffect(() => {
    loadInitialProducts();
  }, []);

  const loadInitialProducts = async () => {
    // First check cache for all products
    const cachedData = getCacheData('products_all');
    if (cachedData) {
      setProducts(cachedData);
      setLoading(false);
    }

    // Refresh in background (no await needed - fire and forget)
    fetchProducts().catch(err => console.error('Error refreshing products:', err));
  };

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    const filters: any = {};
    if (selectedCategory !== 'all') filters.category = selectedCategory;
    if (sortBy) filters.sort = sortBy;

    const cacheKey = selectedCategory === 'all' && !sortBy 
      ? 'products_all' 
      : `products_${selectedCategory}_${sortBy || 'default'}`;
    
    // First check cache
    const cachedData = getCacheData(cacheKey);
    if (cachedData) {
      setProducts(cachedData);
      setLoading(false);
    }

    // Refresh in background
    try {
      setLoading(true);
      const response = await productsAPI.getProducts(filters);
      if (response.success && response.data) {
        setCacheData(cacheKey, response.data);
        setProducts(response.data);
      } else {
        if (!cachedData) {
          Alert.alert('Error', 'Failed to load products');
        }
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'likes':
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'purchases':
        filtered.sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // newest (default)
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleLike = async (productId: string) => {
    try {
      const response = await productsAPI.likeProduct(productId);
      if (response.success) {
        // Update local state
        setProducts(prev =>
          prev.map(product =>
            product._id === productId
              ? {
                  ...product,
                  likes: (product.likes || 0) + 1,
                  likedBy: [...(product.likedBy || []), user?._id || ''],
                }
              : product
          )
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to like product');
      }
    } catch (error: any) {
      console.error('Error liking product:', error);
      // Don't show alert for "already liked" errors
      if (!error.message?.includes('already')) {
        Alert.alert('Error', error.message || 'Failed to like product');
      }
    }
  };

  const isLiked = (product: Product) => {
    return product.likedBy?.some(id => id === user?._id) || false;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const liked = isLiked(item);
    const discount = item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product-detail?id=${item._id}` as any)}
      >
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={(e) => {
            e.stopPropagation();
            handleLike(item._id);
          }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#EF4444' : '#9CA3AF'}
          />
        </TouchableOpacity>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productBrand}>{item.brand}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>Frs{item.price}</Text>
            {item.originalPrice && item.originalPrice > item.price && (
              <Text style={styles.originalPrice}>{item.originalPrice}</Text>
            )}
          </View>
          <View style={styles.productStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#EF4444" />
              <Text style={styles.statText}>{item.likes || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.statText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Ionicons name="filter" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Category:</Text>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    selectedCategory === category && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    fetchProducts();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category && styles.filterChipTextActive,
                    ]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.sortRow}>
            <Text style={styles.filterLabel}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { value: 'newest', label: 'Newest' },
                { value: 'price-asc', label: 'Price: Low to High' },
                { value: 'price-desc', label: 'Price: High to Low' },
                { value: 'likes', label: 'Most Liked' },
                { value: 'purchases', label: 'Most Purchased' },
                { value: 'rating', label: 'Highest Rated' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    sortBy === option.value && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    fetchProducts();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sortBy === option.value && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
  },
  filtersContainer: {
    backgroundColor: '#2D3748',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginRight: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A202C',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
  productsList: {
    padding: 15,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1A202C',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  discountText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  likeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#3B82F6',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 5,
  },
});

