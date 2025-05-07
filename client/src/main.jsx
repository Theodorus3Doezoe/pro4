import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import axios from 'axios'
import {Toaster} from 'react-hot-toast'
import './main.css'

import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Play from './pages/Play/Play';
import Profile from './pages/Profile/Profile';

// Package voor kortere http requests
axios.defaults.baseURL = 'http://localhost:8000'
axios.defaults.withCredentials = true

const router = createBrowserRouter([
  //Register pagina
  {
    path: 'register',
    element: <Register/>,
  },
  //Login pagina
  {
    path: 'login',
    element: <Login/>,
  },
  //Home pagina
  {
    path: '/',
    element: <Home/>,
  },
  //Play pagina
  {
    path: 'play',
    element: <Play/>,
  },
  //Profile
  {
    path: 'profile',
    element: <Profile/>,
  },
])


createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Package voor meldingen */}
    <Toaster position='top-center' toastOptions={{duration: 2000}}/>
    <RouterProvider router={router}/>
  </StrictMode>,
)
