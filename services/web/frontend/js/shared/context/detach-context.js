import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import sysend from 'sysend'
import getMeta from '../../utils/meta'
import { buildUrlWithDetachRole } from '../utils/url-helper'
import useCallbackHandlers from '../hooks/use-callback-handlers'

export const DetachContext = createContext()

DetachContext.Provider.propTypes = {
  value: PropTypes.shape({
    role: PropTypes.oneOf(['detacher', 'detached', null]),
    setRole: PropTypes.func.isRequired,
    broadcastEvent: PropTypes.func.isRequired,
    addEventHandler: PropTypes.func.isRequired,
    deleteEventHandler: PropTypes.func.isRequired,
  }).isRequired,
}

const debugPdfDetach = getMeta('ol-debugPdfDetach')

const SYSEND_CHANNEL = `detach-${getMeta('ol-project_id')}`

export function DetachProvider({ children }) {
  const [role, setRole] = useState(() => getMeta('ol-detachRole') || null)
  const {
    addHandler: addEventHandler,
    deleteHandler: deleteEventHandler,
    callHandlers: callEventHandlers,
  } = useCallbackHandlers()

  useEffect(() => {
    if (debugPdfDetach) {
      console.log('Effect', { role })
    }
    window.history.replaceState({}, '', buildUrlWithDetachRole(role))
  }, [role])

  useEffect(() => {
    sysend.on(SYSEND_CHANNEL, message => {
      if (debugPdfDetach) {
        console.log(`Receiving:`, message)
      }
      callEventHandlers(message)
    })
    return () => sysend.off(SYSEND_CHANNEL)
  }, [callEventHandlers])

  const broadcastEvent = useCallback(
    (event, data) => {
      if (!role) {
        if (debugPdfDetach) {
          console.log('Not Broadcasting (no role)', {
            role,
            event,
            data,
          })
        }
        return
      }
      if (debugPdfDetach) {
        console.log('Broadcasting', {
          role,
          event,
          data,
        })
      }
      sysend.broadcast(SYSEND_CHANNEL, {
        role,
        event,
        data,
      })
    },
    [role]
  )

  useEffect(() => {
    broadcastEvent('connected')
  }, [broadcastEvent])

  useEffect(() => {
    const onBeforeUnload = () => broadcastEvent('closed')
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [broadcastEvent])

  const value = useMemo(
    () => ({
      role,
      setRole,
      broadcastEvent,
      addEventHandler,
      deleteEventHandler,
    }),
    [role, setRole, broadcastEvent, addEventHandler, deleteEventHandler]
  )

  return (
    <DetachContext.Provider value={value}>{children}</DetachContext.Provider>
  )
}

DetachProvider.propTypes = {
  children: PropTypes.any,
}

export function useDetachContext(propTypes) {
  const data = useContext(DetachContext)
  PropTypes.checkPropTypes(propTypes, data, 'data', 'DetachContext.Provider')
  return data
}