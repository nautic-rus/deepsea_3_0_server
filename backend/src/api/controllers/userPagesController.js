const PagesService = require('../services/pagesService');

class UserPagesController {
  /**
   * GET /api/user/pages
   * Returns client-friendly pages available to the authenticated user.
   */
  static async getPages(req, res, next) {
    try {
      const user = req.user;
      const pages = await PagesService.getPagesForUser(user);
      res.json({ pages, generatedAt: new Date().toISOString(), version: 'v1' });
    } catch (err) { next(err); }
  }
}

module.exports = UserPagesController;
