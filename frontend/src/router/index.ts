import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { view: 'dashboard' }
    },
    {
      path: '/create',
      name: 'create',
      meta: { view: 'create' }
    },
    {
      path: '/blog',
      name: 'blog',
      meta: { view: 'blog' }
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      meta: { view: 'leaderboard' }
    },
    {
      path: '/waitlist',
      name: 'waitlist',
      meta: { view: 'waitlist' }
    }
  ],
})

export default router
