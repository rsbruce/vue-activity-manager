import { createRouter, createWebHistory } from 'vue-router'
import activities from '@/controllers/activitiesController.ts'
import eventsController from '@/controllers/eventsController.ts'
import eventShowController from '@/controllers/eventShowController.ts'
import activityTracking from '@/controllers/activityTrackingController.ts'
import activityTypes from '@/controllers/activityTypesController.ts'
import editActivity from '@/controllers/editActivityController.ts'
import editActivityType from '@/controllers/editActivityTypeController.ts'
import { ready } from '@/composables/useSyncEngine'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/pages/HomeView.vue'),
    },
    {
      path: '/events',
      name: 'Events',
      component: () => import('../views/pages/Events.vue'),
      beforeEnter: eventsController.beforeEnter,
      props: eventsController.props
    },
    {
      path: '/events/:id',
      name: 'EventShow',
      component: () => import('../views/pages/EventShow.vue'),
      beforeEnter: eventShowController.beforeEnter,
      props: eventShowController.props
    },
    {
      path: '/activities/index',
      name: 'Edit Activities',
      component: () => import('../views/pages/ActivitiesEdit.vue'),
      beforeEnter: activities.beforeEnter,
      props: activities.props
    },
    {
      path: '/activities/tracking',
      name: 'Activity Tracking',
      component: () => import('../views/pages/ActivityTracking.vue'),
      beforeEnter: activityTracking.beforeEnter,
      props: activityTracking.props
    },
    {
      path: '/activities/types',
      name: 'Activity Types',
      component: () => import('../views/pages/ActivityTypes.vue'),
      beforeEnter: activityTypes.beforeEnter,
      props: activityTypes.props
    },
    {
      path: '/activities/:id/edit',
      name: 'Edit Activity',
      component: () => import('../views/pages/EditActivity.vue'),
      beforeEnter: editActivity.beforeEnter,
      props: editActivity.props
    },
    {
      path: '/activity-types/:id/edit',
      name: 'Edit Activity Type',
      component: () => import('../views/pages/EditActivityType.vue'),
      beforeEnter: editActivityType.beforeEnter,
      props: editActivityType.props
    },
  ],
})

router.beforeEach(async () => {
  await ready
})

export default router
