/** Shell wiring: services injection, global auth actor, and machine → shell side-effect bridge. */
import { createContext, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createActorContext } from "@xstate/react";
import { toast } from "sonner";

import { authMachine, selectAuthLoading } from "@/core/machines/authMachine";

const ServicesContext = createContext(null);
export const useServices = () => useContext(ServicesContext);

export const AuthActor = createActorContext(authMachine);

const readSessionIdFromHash = () => {
  const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
  return new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
};

export function ShellProviders({ services, children }) {
  const input = useMemo(() => ({ services, sessionId: readSessionIdFromHash() }), [services]);
  return (
    <ServicesContext.Provider value={services}>
      <AuthActor.Provider options={{ input }}>
        <AuthEffects />
        {children}
      </AuthActor.Provider>
    </ServicesContext.Provider>
  );
}

/** Executes machine-emitted side effects (toasts, navigation). The UI never decides them. */
export function useShellEffects(actorRef) {
  const navigate = useNavigate();
  useEffect(() => {
    const notify = actorRef.on("notify", (e) => {
      const fn = e.level === "info" ? toast.message : e.level === "error" ? toast.error : toast.success;
      fn(e.title, e.description ? { description: e.description } : undefined);
    });
    const nav = actorRef.on("navigate", (e) => navigate(e.to, { replace: !!e.replace }));
    return () => {
      notify.unsubscribe();
      nav.unsubscribe();
    };
  }, [actorRef, navigate]);
}

function AuthEffects() {
  useShellEffects(AuthActor.useActorRef());
  return null;
}

export const useAuth = () => {
  const actor = AuthActor.useActorRef();
  const user = AuthActor.useSelector((s) => s.context.user);
  const loading = AuthActor.useSelector(selectAuthLoading);
  return { user, loading, login: () => actor.send({ type: "LOGIN" }), logout: () => actor.send({ type: "LOGOUT" }) };
};
