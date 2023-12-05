import { Button, ButtonGroup } from '@blueprintjs/core'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { BlueprintIcons_16Id } from '@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16'
import { RibbonAtom } from '../lib/state'
import { randomString } from 'remeda'



function Ribbon(): JSX.Element {
  const [ribbons, setRibbons] = useAtom(RibbonAtom)
  useEffect(()=>{
    if(ribbons.length>0) return;
    setRibbons([...ribbons, {
      name:'Add new file',
      icon:'add',
      action:()=>{
        window.nole!.notify.info({content:'test'})
        window.nole!.fs.tryCreateFile('Untitled.typ');
      }
    }])
  },[])

  return (
    <ButtonGroup className="w-8" minimal={true} vertical={true}>
      {ribbons.map((ribbonItem) => (
        <Button
          minimal={true}
          key={randomString(6)}
          icon={ribbonItem.icon as BlueprintIcons_16Id}
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          onClick={ribbonItem.action}
          title={ribbonItem.name}
        >
          {/* {tool.name} */}
        </Button>
      ))}
      <div className='h-full'></div>
      <Button key="setting" icon="settings" onClick={()=>{
        window.nole!.notify.warn({content:'Setting: todo...'})
      }} />
    </ButtonGroup>
  )
}

export default Ribbon
