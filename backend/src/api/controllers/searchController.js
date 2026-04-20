const SearchService = require('../services/searchService');

class SearchController {
  static async search(req, res, next) {
    try {
      const actor = req.user || null;
      const query = (req.query && (req.query.q || req.query.search)) || '';
      const entities = req.query && req.query.entities;
      const limit = req.query && req.query.limit;
      const offset = req.query && req.query.offset;
      const projectId = req.query && req.query.project_id;

      const result = await SearchService.searchGlobal(query, actor, {
        entities,
        limit,
        offset,
        project_id: projectId
      });

      res.json({
        data: result.items,
        meta: {
          query: result.query,
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SearchController;
