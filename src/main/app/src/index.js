/* @flow */
/* React, browser and server rendering functions. We need the
 * first import, even though it isn't explicitly referenced
 * in this file, in order to avoid runtime errors. */
import React from 'react';
import { render } from 'react-dom';
import { renderToString } from 'react-dom/server';
import Helmet from 'react-helmet';

/* State management with redux */
import { Provider } from 'react-redux';

/* Routing with react-router */
import { BrowserRouter, ServerRouter, createServerRenderContext } from 'react-router';

import App from './containers/App';

import createStore from './store';

/* Client-side rendering. We rehydrate the Redux store and plugin it into the page render.*/
if (typeof window !== 'undefined') {
  const store = createStore(window.__INITIAL_STATE__);

  const app = (
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );

  render(app, document.getElementById('mount'));
}

/**
 * Performs server-side rendering. The function is exported because the templating function
 * that Spring will call uses this function to perform the meat of the rendering.
 *
 * @param path the path to the resource requested by the client
 * @param state the Redux state supplied by Spring and massaged by the template engine
 * @returns string the rendered page
 */
// eslint-disable-next-line import/prefer-default-export
export function renderApp(path : string, state : Object) {
  const store = createStore(state);

  // first create a context for <ServerRouter>, it's where we keep the
  // results of rendering for the second pass if necessary
  const context = createServerRenderContext();

  function doRender() {
    return renderToString(
      <Provider store={store}>
        <ServerRouter
          location={path}
          context={context}
        >
          <App />
        </ServerRouter>
      </Provider>
    );
  }

  let markup = doRender();

  const result = context.getResult();

  // We ignore result.redirect because Spring should have handled that
  // for us. If we got a miss, then perform a second render pass with
  // the context to clue the <Miss> components into rendering
  // this time (on the client they know from componentDidMount)
  if (result.missed) {
    markup = doRender();
  }

  // Free accumulated object to avoid memory leak and return data to parent renderer
  const head = Helmet.rewind();

  return { markup, head };
}
