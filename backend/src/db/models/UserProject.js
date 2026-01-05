// The `user_projects` table has been removed; project membership is now represented
// via `user_roles` and `roles` tables. This module is kept for backward
// compatibility but its methods throw to prevent accidental usage.
class UserProject {
  static async assign() { throw new Error('user_projects table removed; use user_roles/UserRole.assign instead'); }
  static async unassign() { throw new Error('user_projects table removed; use user_roles/UserRole.unassignByUserAndProject instead'); }
}

module.exports = UserProject;
