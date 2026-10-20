"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FavoritContext = createContext({
  favoritIds: [],
  toggleFavorit: () => {},
  isFavorit: () => false,
  isLoaded: false,
});

const STORAGE_KEY = "katalog_umkm_favorit";

export function FavoritProvider({ children }) {
  const [favoritIds, setFavoritIds] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setFavoritIds(JSON.parse(data));
      }
    } catch (e) {
      console.error("Gagal membaca favorit:", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritIds));
      } catch (e) {
        console.error("Gagal menyimpan favorit:", e);
      }
    }
  }, [favoritIds, isLoaded]);

  const toggleFavorit = (id) => {
    const numId = Number(id);
    setFavoritIds((prev) => {
      if (prev.includes(numId)) {
        return prev.filter((item) => item !== numId);
      } else {
        return [...prev, numId];
      }
    });
  };

  const isFavorit = (id) => {
    return isLoaded && favoritIds.includes(Number(id));
  };

  return (
    <FavoritContext.Provider
      value={{
        favoritIds: isLoaded ? favoritIds : [],
        toggleFavorit,
        isFavorit,
        isLoaded,
      }}
    >
      {children}
    </FavoritContext.Provider>
  );
}

export function useFavorit() {
  return useContext(FavoritContext);
}

