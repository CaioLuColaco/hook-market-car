import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { isTypeOperatorNode } from 'typescript';
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
      const verificarProduto = cart.find(product => product.id === productId)

      if(verificarProduto){
        const { amount: productAmount } = verificarProduto

        const { data: stock } = await api.get<Stock>(`stock/${productId}`)

        const verificadorStock = stock.amount > productAmount

        if(!verificadorStock){
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        const upgradeAmountCart = cart.map(product => {return product.id == productId ? {...product, amount: productAmount + 1} : product})

        setCart(upgradeAmountCart)

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(upgradeAmountCart)
        );
      }else{
        const { data: productData } = await api.get<Product>(`products/${productId}`);

        const cartNewProduct = [...cart, { ...productData, amount: 1 }];

        setCart(cartNewProduct);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(cartNewProduct)
        );
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const verificarProduto = cart.find(product => product.id === productId)
      
      if(!verificarProduto) throw Error()

      const removedProduct = cart.filter(product => product.id != productId)

      setCart(removedProduct)

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(removedProduct)
      );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) return

      const { data: stock } = await api.get(`stock/${productId}`)

      if(amount>stock.amount) return toast.error('Quantidade solicitada fora de estoque');

      const verificadorProduto = cart.find(product => product.id === productId)
      if(!verificadorProduto) throw Error()

      const upgradeCart = cart.map(product => {return product.id == productId ? {...product, amount: amount} : product})

      setCart(upgradeCart)

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(upgradeCart)
      );
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
