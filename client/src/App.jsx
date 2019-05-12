import { createMuiTheme, MuiThemeProvider, withStyles } from '@material-ui/core/styles';
import React, { useState, useRef, Fragment } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';
import first from 'lodash/fp/first';
import axios from 'axios';
import isNull from 'lodash/fp/isNull';

// Material theme
const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: grey,
  },
  typography: {
    useNextVariants: true,
  },
});

// Component styles
const styles = {
  content: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    justifyContent: 'center',
  },
  instruction: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    height: 512,
    width: 512,
  },
  card: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  canvas: {
    position: 'absolute',
  },
  hidden: {
    display: 'none',
  },
};

const App = ({ classes }) => {
  const [inputImage, setInputImage] = useState(null);
  const [outputImage, setOutputImage] = useState(null);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const outputImageRef = useRef(null);
  const handleDrop = (event) => {
    event.preventDefault();
    const file = first(event.dataTransfer.items).getAsFile();

    // Display input image
    const fileReader = new FileReader();
    fileReader.onload = readerEvent => setInputImage(readerEvent.target.result);
    fileReader.readAsDataURL(file);

    // Query for inference data
    const data = new FormData();
    data.append('file', file);
    axios({
      data,
      method: 'post',
      url: 'https://j2iwtz2fll.execute-api.us-east-1.amazonaws.com/dev/inference',
    })
      .then(response => setOutputImage(`data:image/png;base64,${response.data}`))
      .catch(setError);
  };
  const handleDragOver = event => event.preventDefault();
  const outputImageLoaded = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.canvas.width = outputImageRef.current.width;
    ctx.canvas.height = outputImageRef.current.height;
    ctx.drawImage(outputImageRef.current, 0, 0);
    const imageData = ctx.getImageData(
      0,
      0,
      outputImageRef.current.width,
      outputImageRef.current.height,
    );
    for (let i = 0; i < imageData.data.length; i += 4) {
      switch (imageData.data[i]) {
        case 0:
          imageData.data[i + 3] = 0;
          break;
        case 1:
          imageData.data[i] = 255;
          imageData.data[i + 3] = 127;
          break;
        case 2:
          imageData.data[i + 1] = 255;
          imageData.data[i + 3] = 127;
          break;
        case 3:
          imageData.data[i + 2] = 255;
          imageData.data[i + 3] = 127;
          break;
        default:
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };
  return (
    <MuiThemeProvider theme={theme}>
      <AppBar>
        <Toolbar>
          <Typography color="secondary" variant="h6">Deep Kitten</Typography>
        </Toolbar>
      </AppBar>
      <div className={classes.content}>
        <Paper classes={{ root: classes.card }}>
          { isNull(inputImage) ? (
            <div
              className={classes.instruction}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Typography>drop an image here</Typography>
            </div>
          ) : (
            <img alt="input" src={inputImage} />
          ) }
          { isNull(outputImage) ? null : (
            <Fragment>
              <img
                alt="hidden"
                className={classes.hidden}
                onLoad={outputImageLoaded}
                ref={outputImageRef}
                src={outputImage}
              />
              <canvas className={classes.canvas} ref={canvasRef} />
            </Fragment>
          ) }
        </Paper>
      </div>
    </MuiThemeProvider>
  );
};

App.propTypes = {
  classes: PropTypes.shape({ }).isRequired,
};

export default withStyles(styles)(App);
