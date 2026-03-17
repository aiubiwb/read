import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/bookshelf',
      name: 'bookshelf',
      component: () => import('../views/BookshelfView.vue')
    },
    {
      path: '/reader/:id',
      name: 'reader',
      component: () => import('../views/ReaderView.vue')
    }
  ]
})

export default router
