import gql from 'graphql-tag';
export const GlossaryList = gql`
  query glossaryList($perPage: Int, $page: Int ) {
    glossaryList(perPage: $perPage, page: $page, sortDirection: asc) {
      data {
        id
        word
        description
        createdAt
        createdBy {
          firstName
        }
      }
      paging {
        currentPage
        totalPages
        totalItems
      }
    }
  }
`