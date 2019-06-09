import React from "react"
import { Link } from "gatsby"

import { rhythm, scale } from "../utils/typography"

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props
    const rootPath = `${__PATH_PREFIX__}/`
    let header

    if (location.pathname === rootPath) {
      header = (
        <h1
          style={{
            ...scale(1.5),
            marginBottom: rhythm(1.5),
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h1>
      )
    } else {
      header = (
        <h3
          style={{
            fontFamily: `Montserrat, sans-serif`,
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h3>
      )
    }
    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <header>{header}</header>
        <main>{children}</main>
        <footer>
          <hr></hr>
          <p>
            © {new Date().getFullYear()}, Built with
          {` `}
            <a href="https://www.gatsbyjs.org">Gatsby</a>
            {` `}
            and hosted on
          {` `}
            <a href="https://www.netlify.com/ ">Netlify</a>
            {`/`}
            <a href="https://www.cloudflare.com/ ">Cloudflare</a>
          </p>
          <p>
            Source code for this site can be found here:
          {` `}
            <a href="https://github.com/trondhindenes/trondsworking-blog-gatsby">https://github.com/trondhindenes/trondsworking-blog-gatsby</a>
          </p>
          <p>
            <img alt="build status" src="https://api.netlify.com/api/v1/badges/a34056ab-745b-4c26-9f03-48d40eb308f2/deploy-status"></img>
          </p>

        </footer>
      </div>
    )
  }
}

export default Layout
