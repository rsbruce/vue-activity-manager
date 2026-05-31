import { createRouter, createWebHistory } from 'vue-router'
import activities from '@/controllers/activitiesController.ts'
import { ready } from '@/composables/useSyncEngine'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Edit Activities',
      component: () => import('../views/ActivitiesView.vue'),
      beforeEnter: activities.beforeEnter,
      props: activities.props
    },
  ],
})

router.beforeEach(async () => {
  await ready
})

export default router
