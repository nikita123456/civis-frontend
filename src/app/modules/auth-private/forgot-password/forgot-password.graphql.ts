import gql from 'graphql-tag';


export const ForgotPasswordMutation = gql`
  mutation authForgotPassword ($email: String!) {
    authForgotPassword (email : $email) {
        accessToken
    }
  }`;

  export const ResetPasswordMutation = gql`
  mutation authResetPassword ($auth: ResetPassword!) {
    authResetPassword (auth : $auth) {
        accessToken
    }
  }`;

