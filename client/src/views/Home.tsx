import { Alert } from "@mantine/core";
import LinkCreator from "../components/LinkCreator.tsx";
import { Header } from "methone";
import { useEffect } from "react";
import { useAuth } from "../autherization/useAuth.ts";

/**
 * Homepage for Femto, using placeholder functions (not yet implemeted) 
 * hasPermissionsOr and LinkCreator component which also uses placeholder functions
 */

const Home = () => {
    const { 
      hasToken, 
      userPermissions,
      customLinks,
      manageLinks,
      mandateGroups,
      refreshAuthData
    } = useAuth();
    
    // Refresh auth data when component mounts
    useEffect(() => {
      refreshAuthData();
    }, []);
    
    // Check if user can create custom links
    const canCreateCustomLinks = customLinks;
  
    const canManageLinks = manageLinks;
    
    console.log("User permissions:", userPermissions);
    console.log("User groups:", mandateGroups);
    console.log("User can create custom links:", customLinks);
    console.log("User has token:", hasToken);
    console.log("User can manage all links:", canManageLinks);
  
  return (
    <>
        <Header title="Länkförkortare" />
        <div id="content">
            {!hasToken && (
                <Alert title="Du är inte inloggad" color="blue">
                    Logga in för att förkorta länkar
                </Alert>
            )}
            <div
                style={{
                    marginBottom: "25px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <p>
                    Trött på långa länkar? Då har vi systemet just för dig.
                    Stoppa in din långa länk, klicka på "Förkorta" och vips
                    har du en länk man lätt kommer ihåg.
                </p>
                <p>Du kan testa genom att stoppa in example.com</p>
                <p>
                    <b>
                        Detta system får bara användas i sektionsrelaterade
                        ändamål. Du måste vara inloggad för att kunna
                        förkorta en länk.
                    </b>
                </p>
                <p>
                    Tänk på vad som finns i länken du förkortar. Se till att
                    länken inte innehåller några personliga tokens eller
                    liknande.
                </p>
            </div>
            
            {/* LinkCreator Component */}
                <LinkCreator
                    title="Autogenererad förkortad länk"
                    disabled={!hasToken}
                    desc={
                        <>
                            <p>Slumpa en fyra karaktärer lång sträng.</p>
                            {canCreateCustomLinks && (
                            <p>Du kan också specificera en egen kort länk (t.ex. "ior").</p>
                            )}
                        </>
                    }   
                    custom={canCreateCustomLinks} // Only show custom field if user has permission
                    userGroups={mandateGroups || []}
                    showAdvancedOptions={(mandateGroups && mandateGroups.length > 0) || canCreateCustomLinks}     
                    
                />
        </div>
    </>
  );
};

export default Home;