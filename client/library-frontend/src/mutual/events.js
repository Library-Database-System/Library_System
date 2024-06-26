import React from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Header from '.././component/header';
import { useNavigate } from 'react-router-dom';

const Events = (props) => {
  const { loggedIn, email } = props;
  const navigate = useNavigate();
  return (
    <div>
      {/* Header */}
      <Header loggedIn={loggedIn} setLoggedIn={props.setLoggedIn} />

      {/* Main Content */}
      <Container>
        <Typography variant="h2" sx={{ mt: 4 }}>
          Events
        </Typography>
        <Typography variant="h5" sx={{ mt: 2, mb: 4 }}>
          Delivering awesome solutions for you!
        </Typography>

        <Button
          variant="contained"
          onClick={() => {
            navigate('/');
          }}
        >
          Home
        </Button>
      </Container>

      {/* Footer */}
      <Container sx={{ mt: 5 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} Your Company. All rights reserved.
        </Typography>
      </Container>
    </div>
  );
};

export default Events;
