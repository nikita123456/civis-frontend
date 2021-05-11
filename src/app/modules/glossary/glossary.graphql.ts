import gql from 'graphql-tag';
export const GlossaryWord = gql`
  query glossaryWord($id: String!) {
    glossaryWord(id: $id) {
      wordindex {
        word
        description
      }
    }
  }
`