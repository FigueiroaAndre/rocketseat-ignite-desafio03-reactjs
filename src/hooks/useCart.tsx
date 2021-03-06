import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);
      if (productStock.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productInCart) {
        const hasStockAvailable = productStock.amount > productInCart.amount;
        if (!hasStockAvailable) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        setCart(cart => {
          const updatedCart = cart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1
              }
            }
            return product;
          });
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          return updatedCart;
        });
      }
      else {
        const { data } = await api.get<Product>(`/products/${productId}`);
        const newProduct: Product = {
          ...data,
          amount: 1,
        }
        setCart(cart => {
          const updatedCart = [...cart, newProduct];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          return updatedCart;
        });
      }
    } catch {
      toast.error('Erro na adi????o do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removedItem = cart.find(product => product.id === productId);
      if (!removedItem) {
        throw new Error();
      }
      setCart(cart => {
        const updatedCart = cart.filter(product => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
    } catch {
      toast.error('Erro na remo????o do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);
      if (productStock.amount <= 0) return;

      if (productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return ;
      }

      setCart(cart => {
          const updatedCart = cart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount
              }
            }
            return product;
          });
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          return updatedCart;
      })
      return;
      
    } catch {
      toast.error('Erro na altera????o de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
