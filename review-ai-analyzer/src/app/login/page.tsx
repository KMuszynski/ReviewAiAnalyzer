"use client";

import { createClient } from "@/supabase/client";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validate email and password
    if (!email || !password || !confirmPassword) {
      setMessage("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created! Please check your email and click the confirmation link to activate your account."
      );
      // Clear the form after successful signup
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validate email and password
    if (!email || !password) {
      setMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setMessage(
          "Please check your email and click the confirmation link before signing in."
        );
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage("Successfully signed in!");
      // Redirect to home page after successful login
      window.location.href = "/";
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-md w-full space-y-8 z-1 rounded-lg p-8 shadow-lg"
        style={{ background: "rgba(255, 255, 255, 0.95)" }}
      >
        <div>
          <h1 className="text-center text-4xl font-extrabold text-gray-900">
            Phone Review AI Analyzer
          </h1>
          <h2 className="mt-6 text-center text-3xl font-semibold text-gray-900">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6">
          <div className="rounded-md  -space-y-px">
            <div className="mb-4">
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  isSignUp ? "rounded-none" : "rounded-b-md"
                }`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isSignUp && (
              <div className="mb-4">
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes("error") || message.includes("Error")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              onClick={isSignUp ? handleSignUp : handleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
      {/* images */}
      <div className="z-0">
        <img
          src="/subway-surfers.webp"
          alt="subway-surfers"
          width={300}
          height={300}
          className="absolute bottom-0 left-0"
        />
        <img
          src="/tiktok-logo.webp"
          alt="subway-surfers"
          width={300}
          height={300}
          className="absolute top-0 left-0"
        />
        <img
          src="/thumbs-up.png"
          alt="subway-surfers"
          width={300}
          height={300}
          className="absolute top-5 right-5"
        />
        <img
          src="/magnifying-glass.png"
          alt="subway-surfers"
          width={400}
          height={400}
          className="absolute bottom-5 right-5"
        />
      </div>
    </div>
  );
}
