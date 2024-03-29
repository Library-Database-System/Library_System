import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton"; // Import IconButton component
import SearchIcon from "@mui/icons-material/Search"; // Import SearchIcon
import InputAdornment from "@mui/material/InputAdornment";
import { useNavigate } from "react-router-dom";

const Header = props => {
  const { loggedIn } = props;
  const navigate = useNavigate();

  const onButtonClick = () => {
    if (loggedIn) {
      localStorage.removeItem("user");
      props.setLoggedIn(false);
    } else {
      navigate("/login");
    }
  };

  return (
    <div>
      {/* Header */}
      <AppBar position="static" style={{ backgroundColor: "B1DDF0" }}>
        <Toolbar>
          <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
            Book.net
          </Typography>
          <TextField
            label="Search"
            InputProps={{
              endAdornment: (
                <InputAdornment>
                  <IconButton>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button color="inherit" onClick={onButtonClick}>
            Log Out
          </Button>
          <Button 
          color="inherit" 
          onClick={() => { navigate("/profile"); }}>
          Profile
          </Button>
        </Toolbar>
      </AppBar>
    </div>
  );
};

export default Header;
