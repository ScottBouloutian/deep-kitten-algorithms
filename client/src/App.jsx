import { createMuiTheme, MuiThemeProvider, withStyles } from '@material-ui/core/styles';
import React from 'react';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';

const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: grey,
  },
  typography: {
    useNextVariants: true,
  },
});

const styles = {
  content: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    justifyContent: 'center',
  },
  image: {
    background: 'center / contain no-repeat url("https://s3.amazonaws.com/scottbouloutian-dev/cat-learning/pasha.jpg")',
    height: 512,
    width: 512,
  },
  card: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  browse: {
    marginBottom: 32,
  },
};

const App = ({ classes }) => (
  <MuiThemeProvider theme={theme}>
    <AppBar>
      <Toolbar>
        <Typography color="secondary" variant="h6">Cat Learning</Typography>
      </Toolbar>
    </AppBar>
    <div className={classes.content}>
      <Paper classes={{ root: classes.card }}>
        <div className={classes.image} />
        <Button classes={{ root: classes.browse }}>Browse</Button>
      </Paper>
    </div>
  </MuiThemeProvider>
);

App.propTypes = {
  classes: PropTypes.shape({ }).isRequired,
};

export default withStyles(styles)(App);
