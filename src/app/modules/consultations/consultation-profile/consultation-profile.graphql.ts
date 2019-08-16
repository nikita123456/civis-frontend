import gql from 'graphql-tag';

export const ConsultationProfile = gql`
  query consultationProfile($id: Int!) {
    consultationProfile(id: $id) {
      id
      title
      summary
      responseDeadline
      url
      ministry {
        id
        name
        coverPhoto {
          id
          filename
          url
        }
        logo {
          id
          filename
          url
        }
      }
      satisfactionRatingDistribution
      sharedResponses {
        edges {
          node {
            id
            responseText
            user {
              id
              firstName
            }
          }
        }
        totalCount
      }
      updatedAt
    }
  }
`

export const ConsultationProfileCurrentUser = gql`
  query consultationProfileCurrentUser($id: Int!) {
    consultationProfile(id: $id) {
      id
      title
      summary
      responseDeadline
      url
      ministry {
        id
        name
        coverPhoto {
          id
          filename
          url
        }
        logo {
          id
          filename
          url
        }
      }
      satisfactionRatingDistribution
      respondedOn
      sharedResponses {
        edges {
          node {
            id
            responseText
            user {
              id
              firstName
            }
          }
        }
        totalCount
      }
      updatedAt
    }
  }
`

export const SubmitResponseQuery = gql`
  mutation consultationResponseCreate($consultationResponse: ConsultationResponseCreateInput!){
    consultationResponseCreate(consultationResponse: $consultationResponse){
      id
      user {
        firstName
      }
      consultation {
        title
        respondedOn
        sharedResponses {
          edges {
            node {
              id
              responseText
              user {
                id
                firstName
              }
            }
          }
          totalCount
        }
      }
    }
  }
`

