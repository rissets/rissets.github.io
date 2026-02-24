import React, { useState, useEffect } from 'react';
import { StaticQuery, graphql } from 'gatsby';
import PropTypes from 'prop-types';
import styled, { ThemeProvider } from 'styled-components';
import { Head, Loader, Nav, Social, Email, Footer } from '@components';
import { ThemeContextProvider, useThemeContext } from '../context/ThemeContext';
import { GlobalStyle, theme } from '@styles';
import { darkTheme, lightTheme } from '@styles/theme';
const { fontSizes, fonts } = theme;

// https://medium.com/@chrisfitkin/how-to-smooth-scroll-links-in-gatsby-3dc445299558
if (typeof window !== 'undefined') {
  // eslint-disable-next-line global-require
  require('smooth-scroll')('a[href*="#"]');
}

const SkipToContent = styled.a`
  position: absolute;
  top: auto;
  left: -999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: -99;
  &:focus,
  &:active {
    outline: 0;
    color: ${props => props.theme.colors.green};
    background-color: ${props => props.theme.colors.lightNavy};
    border-radius: ${theme.borderRadius};
    padding: 18px 23px;
    font-size: ${fontSizes.sm};
    font-family: ${fonts.SFMono};
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    transition: ${theme.transition};
    top: 0;
    left: 0;
    width: auto;
    height: auto;
    overflow: auto;
    z-index: 99;
  }
`;
const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const LayoutInner = ({ children, location }) => {
  const isHome = location.pathname === '/';
  const [isLoading, setIsLoading] = useState(isHome);
  const { isDarkMode } = useThemeContext();
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (location.hash) {
      const id = location.hash.substring(1); // location.hash without the '#'
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
          el.focus();
        }
      }, 0);
    }
  }, [isLoading]);

  return (
    <ThemeProvider theme={currentTheme}>
      <StaticQuery
        query={graphql`
          query LayoutQuery {
            site {
              siteMetadata {
                title
                siteUrl
                description
              }
            }
          }
        `}
        render={({ site }) => (
          <div id="root">
            <Head metadata={site.siteMetadata} />

            <GlobalStyle />

            <SkipToContent href="#content">Skip to Content</SkipToContent>

            {isLoading && isHome ? (
              <Loader finishLoading={() => setIsLoading(false)} />
            ) : (
              <StyledContent>
                <Nav isHome={isHome} />
                <Social isHome={isHome} />
                <Email isHome={isHome} />

                <div id="content">
                  {children}
                  <Footer />
                </div>
              </StyledContent>
            )}
          </div>
        )}
      />
    </ThemeProvider>
  );
};

LayoutInner.propTypes = {
  children: PropTypes.node.isRequired,
  location: PropTypes.object.isRequired,
};

const Layout = ({ children, location }) => (
  <ThemeContextProvider>
    <LayoutInner location={location}>{children}</LayoutInner>
  </ThemeContextProvider>
);

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  location: PropTypes.object.isRequired,
};

export default Layout;
