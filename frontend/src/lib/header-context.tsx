/**
 * @file header-context.tsx
 * @description Customizable header context and slot components for feature action injection.
 * @owner Platform UI Core
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

interface HeaderContextType {
  title: React.ReactNode | null;
  setTitle: (title: React.ReactNode | null) => void;
  actions: React.ReactNode | null;
  setActions: (actions: React.ReactNode | null) => void;
  center: React.ReactNode | null;
  setCenter: (center: React.ReactNode | null) => void;
  tabs: React.ReactNode | null;
  setTabs: (tabs: React.ReactNode | null) => void;
  sidebarOffset: number;
  setSidebarOffset: (offset: number) => void;
  isSidebarOffsetDragging: boolean;
  setIsSidebarOffsetDragging: (dragging: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<React.ReactNode | null>(null);
  const [actions, setActions] = useState<React.ReactNode | null>(null);
  const [center, setCenter] = useState<React.ReactNode | null>(null);
  const [tabs, setTabs] = useState<React.ReactNode | null>(null);
  const [sidebarOffset, setSidebarOffset] = useState<number>(0);
  const [isSidebarOffsetDragging, setIsSidebarOffsetDragging] = useState<boolean>(false);

  const value = useMemo(
    () => ({
      title,
      setTitle,
      actions,
      setActions,
      center,
      setCenter,
      tabs,
      setTabs,
      sidebarOffset,
      setSidebarOffset,
      isSidebarOffsetDragging,
      setIsSidebarOffsetDragging,
    }),
    [title, actions, center, tabs, sidebarOffset, isSidebarOffsetDragging]
  );

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

/**
 * Declarative component for features to inject custom actions into the top main header.
 * Automatically clears actions when the component unmounts.
 */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  const { setActions } = useHeader();

  useEffect(() => {
    setActions(children);
    return () => setActions(null);
  }, [children, setActions]);

  return null;
}

/**
 * Declarative component for features to inject centered elements into the top main header.
 * Automatically clears centered content when the component unmounts.
 */
export function HeaderCenter({ children }: { children: React.ReactNode }) {
  const { setCenter } = useHeader();

  useEffect(() => {
    setCenter(children);
    return () => setCenter(null);
  }, [children, setCenter]);

  return null;
}

/**
 * Declarative component for features to override the top main header title.
 * Automatically clears custom title when the component unmounts.
 */
export function HeaderTitle({ children }: { children: React.ReactNode }) {
  const { setTitle } = useHeader();

  useEffect(() => {
    setTitle(children);
    return () => setTitle(null);
  }, [children, setTitle]);

  return null;
}

/**
 * Declarative component for features to inject document or navigation tabs into the top header.
 * Automatically clears tabs when the component unmounts.
 */
export function HeaderTabs({ children }: { children: React.ReactNode }) {
  const { setTabs } = useHeader();

  useEffect(() => {
    setTabs(children);
    return () => setTabs(null);
  }, [children, setTabs]);

  return null;
}

/**
 * Declarative component for features to communicate the left sidebar boundary width
 * to the top header so tabs align with the workspace sidebar.
 */
export function HeaderSidebarOffset({
  offset,
  isDragging = false,
}: {
  offset: number;
  isDragging?: boolean;
}) {
  const { setSidebarOffset, setIsSidebarOffsetDragging } = useHeader();

  useEffect(() => {
    setSidebarOffset(offset);
    setIsSidebarOffsetDragging(isDragging);
    return () => {
      setSidebarOffset(0);
      setIsSidebarOffsetDragging(false);
    };
  }, [offset, isDragging, setSidebarOffset, setIsSidebarOffsetDragging]);

  return null;
}
