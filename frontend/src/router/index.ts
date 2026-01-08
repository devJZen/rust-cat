import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Dummy component for routes (actual rendering happens in App.vue)
const DummyComponent = { template: '<div></div>' }

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: DummyComponent,
    meta: { view: 'dashboard' }
  },
  {
    path: '/create',
    name: 'create',
    component: DummyComponent,
    meta: { view: 'create' }
  },
  {
    path: '/blog',
    name: 'blog',
    component: DummyComponent,
    meta: { view: 'blog' }
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: DummyComponent,
    meta: { view: 'leaderboard' }
  },
  {
    path: '/waitlist',
    name: 'waitlist',
    component: DummyComponent,
    meta: { view: 'waitlist' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
