/*
    Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
    Available via Academic Free License >= 2.1 OR the modified BSD license.
    see: http://dojotoolkit.org/license for details
*/
package org.dojotoolkit.lsjs;

import java.io.File;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.dojotoolkit.json.JSONParser;
import org.dojotoolkit.json.JSONSerializer;

public class LsJsServlet extends HttpServlet {
	private static Logger logger = Logger.getLogger("org.dojotoolkit.lsjs");
	private static final long serialVersionUID = 1L;
	private SimpleDateFormat format = null;

	public LsJsServlet() {
		format = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz");
	}
	
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		@SuppressWarnings("unchecked")
		List<Map<String, String>> timestamps = (List<Map<String, String>>)JSONParser.parse(request.getReader());
		List<String> modified = new ArrayList<String>();
		for (Map<String, String> timestamp : timestamps) {
			String url = timestamp.get("url");
			String ts = timestamp.get("timestamp");
			logger.logp(Level.FINE, getClass().getName(), "service", "timestamp entry ["+url+"] ["+ts+"]");
			try {
				Date d = null;
				synchronized(format) {
					d = format.parse(ts);
				}
				String path = null;
				String fullyQualifiedURL = request.getScheme() + "://"+ request.getServerName() + ":" + request.getServerPort()+request.getContextPath();
				if (url.startsWith(request.getContextPath())) {
					path = getServletContext().getRealPath(url.substring(request.getContextPath().length()));
				} else if (url.startsWith(fullyQualifiedURL)){
					path = getServletContext().getRealPath(url.substring(fullyQualifiedURL.length()));
				}
				if (path != null) {
					File f = new File(path);
					if (d.getTime() != f.lastModified()) {
						logger.logp(Level.INFO, getClass().getName(), "service", "url ["+url+"] timstamp is different ["+d.getTime()+"] vs ["+f.lastModified()+"]");
						modified.add(url);
					}
				} else {
					logger.logp(Level.SEVERE, getClass().getName(), "service", "url ["+url+"] cannot be matched to a file path");
				}
			} catch (ParseException e) {
				throw new ServletException(e);
			}
		}
		response.setContentType("application/json");
		JSONSerializer.serialize(response.getWriter(), modified);	
	}
}
