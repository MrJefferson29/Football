import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { productsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

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
  sizes: string[];
  colors: string[];
  specifications?: {
    material?: string;
    careInstructions?: string;
    countryOfOrigin?: string;
    warranty?: string;
  };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProduct(id!);
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        Alert.alert('Error', 'Failed to load product');
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', error.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!product) return;
    
    try {
      const response = await productsAPI.likeProduct(product._id);
      if (response.success) {
        setProduct({
          ...product,
          likes: (product.likes || 0) + 1,
          likedBy: [...(product.likedBy || []), user?._id || ''],
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to like product');
      }
    } catch (error: any) {
      console.error('Error liking product:', error);
      if (!error.message?.includes('already')) {
        Alert.alert('Error', error.message || 'Failed to like product');
      }
    }
  };

  const handlePurchase = async () => {
    if (!product) return;

    try {
      setPurchasing(true);
      const response = await productsAPI.purchaseProduct(product._id);
      if (response.success) {
        setShowPurchaseModal(true);
        setProduct({
          ...product,
          purchaseCount: (product.purchaseCount || 0) + 1,
          stock: product.stock > 0 ? product.stock - 1 : 0,
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to purchase product');
      }
    } catch (error: any) {
      console.error('Error purchasing product:', error);
      Alert.alert('Error', error.message || 'Failed to purchase product');
    } finally {
      setPurchasing(false);
    }
  };

  const isLiked = () => {
    return product?.likedBy?.some(id => id === user?._id) || false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const images = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={handleLike} style={styles.likeButtonHeader}>
          <Ionicons
            name={isLiked() ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked() ? '#EF4444' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {images[selectedImage] ? (
            <Image source={{ uri: images[selectedImage] }} style={styles.mainImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
            </View>
          )}
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageThumbnails}
            >
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(index)}
                  style={[
                    styles.thumbnail,
                    selectedImage === index && styles.thumbnailActive,
                  ]}
                >
                  <Image source={{ uri: image }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.price}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text style={styles.originalPrice}>${product.originalPrice}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={18} color="#EF4444" />
              <Text style={styles.statText}>{product.likes || 0} likes</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cart" size={18} color="#10B981" />
              <Text style={styles.statText}>{product.purchaseCount || 0} purchases</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.statText}>{product.rating?.toFixed(1) || '0.0'}</Text>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Sizes</Text>
              <View style={styles.sizeContainer}>
                {product.sizes.map((size, index) => (
                  <View key={index} style={styles.sizeChip}>
                    <Text style={styles.sizeText}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Colors</Text>
              <View style={styles.colorContainer}>
                {product.colors.map((color, index) => (
                  <View key={index} style={[styles.colorChip, { backgroundColor: color }]} />
                ))}
              </View>
            </View>
          )}

          {/* Specifications */}
          {product.specifications && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {product.specifications.material && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Material:</Text>
                  <Text style={styles.specValue}>{product.specifications.material}</Text>
                </View>
              )}
              {product.specifications.countryOfOrigin && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Origin:</Text>
                  <Text style={styles.specValue}>{product.specifications.countryOfOrigin}</Text>
                </View>
              )}
              {product.specifications.warranty && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Warranty:</Text>
                  <Text style={styles.specValue}>{product.specifications.warranty}</Text>
                </View>
              )}
              {product.specifications.careInstructions && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Care:</Text>
                  <Text style={styles.specValue}>{product.specifications.careInstructions}</Text>
                </View>
              )}
            </View>
          )}

          {/* Stock Info */}
          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!product.isAvailable || product.stock <= 0) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!product.isAvailable || product.stock <= 0 || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
              <Text style={styles.purchaseButtonText}>
                {product.stock <= 0 ? 'Out of Stock' : 'Purchase'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Purchase Confirmation Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Order Confirmed!</Text>
            <Text style={styles.modalMessage}>
              Your purchase of {product.name} has been confirmed.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPurchaseModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  likeButtonHeader: {
    padding: 5,
  },
  content: {
    flex: 1,
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
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  imageContainer: {
    backgroundColor: '#2D3748',
  },
  mainImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#1A202C',
  },
  imagePlaceholder: {
    width: '100%',
    height: 400,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageThumbnails: {
    flexDirection: 'row',
    padding: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#3B82F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  productInfo: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  discountText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: '#3B82F6',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 20,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2D3748',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#CBD5E0',
    lineHeight: 24,
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2D3748',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  sizeText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4A5568',
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#9CA3AF',
    width: 100,
  },
  specValue: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    flex: 1,
  },
  stockInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#2D3748',
    borderRadius: 8,
  },
  stockText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#10B981',
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#1A202C',
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#4A5568',
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2D3748',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
});

