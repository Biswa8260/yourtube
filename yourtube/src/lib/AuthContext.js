import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [otpVerificationData, setOtpVerificationData] = useState(null);

  useEffect(() => {
    // Restore user and local theme on startup
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const localTheme = localStorage.getItem("theme") || "dark";
    setTheme(localTheme);
  }, []);

  useEffect(() => {
    if (user && user.theme) {
      setTheme(user.theme);
      localStorage.setItem("theme", user.theme);
    }
  }, [user]);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata.theme) {
      setTheme(userdata.theme);
      localStorage.setItem("theme", userdata.theme);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    setOtpVerificationData(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const getPublicIp = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      return data.ip || "127.0.0.1";
    } catch (err) {
      console.warn("Could not retrieve public IP:", err);
      return "127.0.0.1";
    }
  };

  const performLogin = async (firebaseuser) => {
    try {
      const ip = await getPublicIp();
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        ip,
        device: navigator.userAgent
      };

      const response = await axiosInstance.post("/user/login", payload);
      
      if (response.data.requireOTP) {
        setOtpVerificationData({
          email: firebaseuser.email,
          tempToken: response.data.tempToken,
          firebaseuser
        });
        return false;
      } else {
        login(response.data.result);
        return true;
      }
    } catch (error) {
      console.error("Login verification failed:", error);
      logout();
      return false;
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await performLogin(result.user);
    } catch (error) {
      console.error(error);
    }
  };

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (user) {
      try {
        const res = await axiosInstance.patch(`/user/update-theme/${user._id || user.id}`, {
          theme: newTheme
        });
        if (res.status === 200) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch (err) {
        console.error("Failed to update user theme profile:", err);
      }
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        if (!user && !otpVerificationData) {
          await performLogin(firebaseuser);
        }
      }
    });
    return () => unsubcribe();
  }, [user, otpVerificationData]);

  return (
    <UserContext.Provider
      value={{
        user,
        theme,
        updateTheme,
        otpVerificationData,
        setOtpVerificationData,
        login,
        logout,
        handlegooglesignin
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
