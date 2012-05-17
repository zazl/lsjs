/*
    Copyright (c) 2004-2012, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/
package org.dojotoolkit.lsjs;

import java.io.IOException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class CORSFilter implements Filter {
	public void init(FilterConfig config) throws ServletException {}
	
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
		String origin = ((HttpServletRequest)request).getHeader("origin");
		if (origin != null) {
			((HttpServletResponse)response).setHeader("Access-Control-Allow-Origin", "*");
			String accessControlRequestHeaders = ((HttpServletRequest)request).getHeader("Access-Control-Request-Headers");
			if (accessControlRequestHeaders != null) {
				((HttpServletResponse)response).setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, HEAD");
				((HttpServletResponse)response).setHeader("Access-Control-Allow-Headers", accessControlRequestHeaders);
			}
		}
		chain.doFilter(request, response);
	}

	public void destroy() {}
}
