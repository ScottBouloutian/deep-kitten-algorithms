import { withTheme, createMuiTheme } from '@material-ui/core/styles';
import React from 'react';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import red from '@material-ui/core/colors/red';
import grey from '@material-ui/core/colors/grey';

const theme = createMuiTheme({
  palette: {
    primary: red,
    secondary: grey['50'],
  },
});


const App = () => (
  <div>
    <AppBar>
      <Toolbar>
        <Typography color="secondary" variant="title">Cat Learning</Typography>
      </Toolbar>
    </AppBar>
    <Button>Browse</Button>
  </div>
);

export default withTheme(theme)(App);
