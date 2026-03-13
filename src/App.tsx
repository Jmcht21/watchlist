/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Social from './pages/Social';
import Search from './pages/Search';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import MediaDetails from './pages/MediaDetails';
import GroupDetails from './pages/GroupDetails';
import Settings from './pages/Settings';

export default function App() {
  const routerBase = import.meta.env.BASE_URL;

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router basename={routerBase}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="social" element={<Social />} />
              <Route path="groups" element={<Social />} />
              <Route path="settings" element={<Settings />} />
              <Route path="search" element={<Search />} />
              <Route path="profile" element={<Profile />} />
              <Route path="user/:uid" element={<UserProfile />} />
              <Route path="media/:type/:id" element={<MediaDetails />} />
              <Route path="group/:id" element={<GroupDetails />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
