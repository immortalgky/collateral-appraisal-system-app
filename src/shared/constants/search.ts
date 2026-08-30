/**
 * The appraisal list route. Named `search` because that is what the page is — a filterable search
 * over appraisals. `/appraisals/list` still resolves here via a redirect that preserves the query
 * string, since dashboard widgets link to the old path.
 */
export const APPRAISAL_SEARCH_ROUTE = '/appraisals/search';

/**
 * sessionStorage key AppraisalLayout parks the origin path under, so Exit returns where the user
 * actually came from. Shared here because the global search writes the same trail.
 */
export const RETURN_PATH_KEY = 'appraisalReturnPath';
