import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink, Theme } from '../types';

interface KnowledgeGraphProps {
  data: GraphData;
  theme: Theme;
  onNodeClick?: (nodeId: string) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, theme, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Colors based on theme
    const nodeColor = theme === 'dark' ? '#22d3ee' : '#0891b2'; // Cyan
    const nodeGlow = theme === 'dark' ? '#06b6d4' : 'transparent';
    const linkColor = theme === 'dark' ? '#475569' : '#cbd5e1';
    const textColor = theme === 'dark' ? '#f1f5f9' : '#1e293b';

    // Simulation setup
    // Using (d3 as any) to bypass TypeScript errors where specific modules like d3-force might not be correctly exposed in the types
    const simulation = (d3 as any).forceSimulation(data.nodes)
      .force("link", (d3 as any).forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", (d3 as any).forceManyBody().strength(-300))
      .force("center", (d3 as any).forceCenter(width / 2, height / 2))
      .force("collide", (d3 as any).forceCollide(30));

    // Glow filter definition
    if (theme === 'dark') {
      const defs = svg.append("defs");
      const filter = defs.append("filter")
        .attr("id", "glow");
      filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }

    // Zoom behavior
    const g = svg.append("g");
    svg.call((d3 as any).zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 4])
      .on("zoom", (event: any) => {
        g.attr("transform", event.transform);
      }));

    // Links
    const link = g.append("g")
      .attr("stroke", linkColor)
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 1.5);

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call((d3 as any).drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", (d: any) => 5 + (d.val || 1) * 2)
      .attr("fill", nodeColor)
      .attr("stroke", theme === 'dark' ? '#fff' : '#fff')
      .attr("stroke-width", 1.5)
      .style("filter", theme === 'dark' ? "url(#glow)" : "none")
      .on("click", (event: any, d: any) => {
        if (onNodeClick) onNodeClick(d.id);
      });

    // Node labels
    node.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text((d: any) => d.label)
      .attr("fill", textColor)
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .style("pointer-events", "none")
      .style("text-shadow", theme === 'dark' ? "0 0 3px #000" : "none");

    // Ticks
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, theme]);

  return (
    <div ref={containerRef} className="w-full h-full bg-paper-50 dark:bg-cyber-900 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-white/80 dark:bg-black/50 backdrop-blur rounded text-xs font-mono text-slate-500">
        Drag to move • Scroll to zoom
      </div>
      <svg ref={svgRef} className="w-full h-full block"></svg>
    </div>
  );
};