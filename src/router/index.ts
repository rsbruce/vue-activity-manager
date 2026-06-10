import { createRouter, createWebHistory } from 'vue-router'
import { eventsIndexController, eventShowController, editEventController } from '@/controllers/eventsController.ts'
import {
  activitiesIndexController,
  activityTrackingController,
  activityTypesController,
  editActivityController,
  editActivityTypeController,
} from '@/controllers/activities.ts'
import { ready } from '@/composables/useSyncEngine'
import { peopleIndexController, personShowController, personEditController } from '@/controllers/peopleController.ts'
import {
  peopleGroupsIndexController,
  newPeopleGroupController,
  peopleGroupShowController,
} from '@/controllers/peopleGroups.ts'
import { timetableController } from '@/controllers/timetable.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/pages/HomeView.vue'),
    },
    {
      path: '/timetable',
      name: 'Timetable',
      component: () => import('../views/pages/Timetable.vue'),
      beforeEnter: timetableController.beforeEnter,
      props: timetableController.props
    },
    {
      path: '/people',
      name: 'People',
      component: () => import('../views/pages/People.vue'),
      beforeEnter: peopleIndexController.beforeEnter,
      props: peopleIndexController.props
    },
    {
      path: '/people/groups/new',
      name: 'New People Group',
      component: () => import('../views/pages/CreatePeopleGroup.vue'),
      beforeEnter: newPeopleGroupController.beforeEnter,
      props: newPeopleGroupController.props
    },
    {
      path: '/people/groups',
      name: 'People Groups',
      component: () => import('../views/pages/PeopleGroups.vue'),
      beforeEnter: peopleGroupsIndexController.beforeEnter,
      props: peopleGroupsIndexController.props
    },
    {
      path: '/people/groups/:id',
      name: 'People Group',
      component: () => import('../views/pages/PeopleGroupShow.vue'),
      beforeEnter: peopleGroupShowController.beforeEnter,
      props: peopleGroupShowController.props
    },
    {
      path: '/people/:id',
      name: 'Person',
      component: () => import('../views/pages/PersonShow.vue'),
      beforeEnter: personShowController.beforeEnter,
      props: personShowController.props
    },
    {
      path: '/people/:id/edit',
      name: 'Edit Person',
      component: () => import('../views/pages/EditPerson.vue'),
      beforeEnter: personEditController.beforeEnter,
      props: personEditController.props
    },
    {
      path: '/events',
      name: 'Events Index',
      component: () => import('../views/pages/Events.vue'),
      beforeEnter: eventsIndexController.beforeEnter,
      props: eventsIndexController.props
    },
    {
      path: '/events/:id',
      name: 'Event',
      component: () => import('../views/pages/EventShow.vue'),
      beforeEnter: eventShowController.beforeEnter,
      props: eventShowController.props
    },
    {
      path: '/events/:id/edit',
      name: 'Edit Event',
      component: () => import('../views/pages/EditEvent.vue'),
      beforeEnter: editEventController.beforeEnter,
      props: editEventController.props
    },
    {
      path: '/activities/index',
      name: 'Edit Activities',
      component: () => import('../views/pages/ActivitiesEdit.vue'),
      beforeEnter: activitiesIndexController.beforeEnter,
      props: activitiesIndexController.props
    },
    {
      path: '/activities/tracking',
      name: 'Activity Tracking',
      component: () => import('../views/pages/ActivityTracking.vue'),
      beforeEnter: activityTrackingController.beforeEnter,
      props: activityTrackingController.props
    },
    {
      path: '/activities/types',
      name: 'Activity Types',
      component: () => import('../views/pages/ActivityTypes.vue'),
      beforeEnter: activityTypesController.beforeEnter,
      props: activityTypesController.props
    },
    {
      path: '/activities/:id/edit',
      name: 'Edit Activity',
      component: () => import('../views/pages/EditActivity.vue'),
      beforeEnter: editActivityController.beforeEnter,
      props: editActivityController.props
    },
    {
      path: '/activity-types/:id/edit',
      name: 'Edit Activity Type',
      component: () => import('../views/pages/EditActivityType.vue'),
      beforeEnter: editActivityTypeController.beforeEnter,
      props: editActivityTypeController.props
    },
  ],
})

router.beforeEach(async () => {
  await ready
})

export default router
