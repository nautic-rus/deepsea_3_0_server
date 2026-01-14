/**
 * Pages configuration used to generate client menu.
 *
 * Each page may include an array of permission codes. If empty or missing,
 * the page is considered available to any authenticated user.
 *
 * Edit this file to match your frontend routes and required permissions.
 */

module.exports = [
  {
    id: 'dashboard',
    path: '/dashboard',
    titleKey: 'menu.dashboard',
    permissions: [],
    order: 0,
    icon: 'dashboard'
  },
  {
    id: 'projects',
    path: '/projects',
    titleKey: 'menu.projects',
    permissions: ['projects:list', 'projects:view'],
    order: 10,
    icon: 'folder',
    children: [
      {
        id: 'project-details',
        path: '/projects/:id',
        titleKey: 'menu.projectDetails',
        permissions: ['projects:view']
      }
    ]
  },
  {
    id: 'documents',
    path: '/documents',
    titleKey: 'menu.documents',
    permissions: ['documents:list', 'documents:view'],
    order: 20,
    icon: 'file'
  },
  {
    id: 'users',
    path: '/admin/users',
    titleKey: 'menu.users',
    permissions: ['users:manage', 'users:view'],
    order: 30,
    icon: 'users'
  }
];
