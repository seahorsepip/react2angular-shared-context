import React, { Fragment, FunctionComponent, JSXElementConstructor, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { v4 as uuid } from 'uuid'

interface IComponentInstance {
  key: string;
  node: HTMLElement;
  component: JSXElementConstructor<any>;
  props: any;
}

const createSharedContext = (Root: JSXElementConstructor<any> = Fragment) => {
  // Make method accessible by both SharedContext and withSharedContext
  let renderWithSharedContext: { (component: IComponentInstance): { update: (props: any) => void; remove: () => void; }; }

  const SharedContext: FunctionComponent<any> = rootProps => {
    // List of components and their props to be rendered with react portal in their designated nodes
    const [components, setComponents] = useState<{ [key: string]: IComponentInstance }>({})

    useEffect(() => {
      renderWithSharedContext = (component: IComponentInstance) => {
        // Add component to list
        setComponents(prevState => {
          prevState[component.key] = component
          return { ...prevState }
        })

        // Return callbacks to update and remove component from list
        return {
          update: props => {
            setComponents(prevState => {
              prevState[component.key].props = props
              return { ...prevState }
            })
          },
          remove: () => {
            setComponents(prevState => {
              delete prevState[component.key]
              return { ...prevState }
            })
          }
        }
      }
    }, [])

    // Return list of react portals wrapped in one or multiple providers
    return (
      <Root {...rootProps}>
        {Object
          .values(components)
          .map(({ key, node, component: C, props }) => createPortal(<C key={key} {...props}/>, node))}
      </Root>
    )
  }

  const withSharedContext: ((component: JSXElementConstructor<any>) => FunctionComponent<any>) = component => {
    // Create as local variable instead of returning inline to fix TSLint
    const WithSharedContext: FunctionComponent<any> = props => {
      const key = useRef(uuid())														// Create unique key for this instance
      const ref = useRef<HTMLDivElement>(null)	  // Hold reference to rendered hidden DOM node
      const instance = useRef<any>()												// Instance is SharedContext

      useEffect(() => {
        if (instance.current) {
          // Pass prop updates to instance in SharedContext
          instance.current.update(props)
        }
      }, [props])

      useEffect(() => {
        if (ref.current && ref.current.parentElement) {
          // Create instance in SharedContext
          instance.current = renderWithSharedContext({
            key: key.current,
            node: ref.current.parentElement,
            component,
            props
          })

          // Return callback to unmount component in SharedContext when this component is unmounted
          return instance.current.remove
        }
      }, [ref.current])

      // Hidden <div> component only used to get reference in dom
      return <div ref={ref} style={{ display: 'none' }}/>
    }

    return WithSharedContext
  }

  return {
    component: SharedContext,
    use: withSharedContext
  }
}

export default createSharedContext
