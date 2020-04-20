import React, {
  ComponentProps,
  Fragment,
  FunctionComponent,
  JSXElementConstructor,
  useEffect,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'
import { v4 as uuid } from 'uuid'

interface IComponent {
  key: string;
  node: HTMLElement;
  component: JSXElementConstructor<any>;
  props: any;
}

interface IComponentInstance<T> {
  update: (props: T) => void;
  remove: () => void;
}

const createSharedContext = (Root: JSXElementConstructor<any> = Fragment) => {
  // Make method accessible by both SharedContext and withSharedContext
  let renderWithSharedContext: { (component: IComponent): IComponentInstance<ComponentProps<typeof component.component>> }

  const SharedContext: FunctionComponent<ComponentProps<typeof Root>> = rootProps => {
    // List of components and their props to be rendered with react portal in their designated nodes
    const [components, setComponents] = useState<{ [key: string]: IComponent }>({})

    useEffect(() => {
      renderWithSharedContext = (component: IComponent) => {
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

  const useSharedContext: ((component: JSXElementConstructor<any>) => FunctionComponent<any>) = component => {
    // Create as local variable instead of returning inline to fix TSLint
    const UseSharedContext: FunctionComponent<ComponentProps<typeof component>> = props => {
      // Create unique key for this instance
      const key = useRef(uuid())
      // Hold reference to rendered hidden DOM node
      const ref = useRef<HTMLDivElement>(null)
      // Instance is SharedContext
      const instance = useRef<IComponentInstance<ComponentProps<typeof component>>>()

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
        return
      }, [ref.current])

      // Hidden <div> component only used to get reference in dom
      return <div ref={ref} style={{ display: 'none' }}/>
    }

    return UseSharedContext
  }

  return {
    component: SharedContext,
    use: useSharedContext
  }
}

export default createSharedContext
